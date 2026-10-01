import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { changeRelationship } from './changeRelationship.ts';
import { createRelationshipOverlay } from './createRelationshipOverlay.svelte.ts';
import type { ViewerRelation } from './ViewerRelation.ts';

const base = 'https://apiz.trakt.tv';
const empty: ViewerRelation = { follow: 'none', followsYou: false, blocked: false, requestId: null };
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const setup = (relation = empty) => {
  const overlay = createRelationshipOverlay();
  const notify = { error: vi.fn() };
  const params = {
    slug: 'leela',
    isPrivate: false,
    relation,
    overlay,
    notify,
    request: (path: string, method: 'POST' | 'DELETE') => rawApiFetch({ path, init: { method } }),
  };
  return {
    overlay,
    notify,
    change: (action: Parameters<typeof changeRelationship>[0]['action'], isPrivate = false) =>
      changeRelationship({ ...params, action, isPrivate }),
  };
};

describe('changeRelationship', () => {
  it('should follow optimistically, then use the API approval instead of the privacy guess', async () => {
    const state = setup();
    server.use(http.post(`${base}/users/leela/follow`, () => {
      expect(state.overlay.state('leela', empty)).toMatchObject({
        relation: { follow: 'following' },
        followerDelta: 1,
      });
      expect(state.overlay.busy('leela')).toBe(true);
      return HttpResponse.json({ approved_at: null, user: { username: 'leela' } }, { status: 201 });
    }));
    expect(await state.change('follow')).toBe(true);
    expect(state.overlay.state('leela', empty)).toMatchObject({ relation: { follow: 'pending' }, followerDelta: 0 });
    expect(state.overlay.busy('leela')).toBe(false);
  });

  it('should replace a private request with Following when the API approves it', async () => {
    const state = setup();
    server.use(
      http.post(
        `${base}/users/leela/follow`,
        () => HttpResponse.json({ approved_at: '2026-09-30T00:00:00Z', user: { username: 'leela' } }, { status: 201 }),
      ),
    );
    await state.change('follow', true);
    expect(state.overlay.state('leela', empty)).toMatchObject({ relation: { follow: 'following' }, followerDelta: 1 });
  });

  it.each(['following', 'pending'] as const)(
    'should delete a %s follow and update only approved follower counts',
    async (follow) => {
      const state = setup({ ...empty, follow });
      server.use(http.delete(`${base}/users/leela/follow`, () => new HttpResponse(null, { status: 204 })));
      expect(await state.change('unfollow')).toBe(true);
      expect(state.overlay.state('leela', empty)).toMatchObject({
        relation: { follow: 'none' },
        followerDelta: follow === 'following' ? -1 : 0,
      });
    },
  );

  it.each([401, 409, 429, 500])('should roll back all state and show an error for HTTP %s', async (status) => {
    const state = setup();
    server.use(http.post(`${base}/users/leela/follow`, () => new HttpResponse(null, { status })));
    expect(await state.change('follow')).toBe(false);
    expect(state.overlay.state('leela', empty)).toMatchObject({ relation: empty, followerDelta: 0 });
    expect(state.notify.error).toHaveBeenCalledOnce();
  });

  it('should reject malformed proxied follow responses and roll back', async () => {
    const state = setup();
    server.use(http.post(`${base}/users/leela/follow`, () => HttpResponse.json({ pending: false })));
    expect(await state.change('follow')).toBe(false);
    expect(state.overlay.state('leela', empty).relation).toEqual(empty);
  });

  it('should serialize writes to the same person while allowing another person to change', async () => {
    const state = setup();
    state.overlay.start('leela');
    expect(await state.change('follow')).toBe(false);
    expect(state.overlay.busy('fry')).toBe(false);
    expect(state.notify.error).not.toHaveBeenCalled();
  });

  it.each(['approve', 'deny', 'blockRequest'] as const)(
    'should resolve a request using %s, preserve the banner and prevent another resolution',
    async (action) => {
      const state = setup({ ...empty, requestId: 42 });
      const path = action === 'blockRequest' ? '/users/leela/block' : '/users/requests/42';
      const handle = action === 'deny' ? http.delete : http.post;
      server.use(
        handle(
          `${base}${path}`,
          () =>
            action === 'approve'
              ? HttpResponse.json({ followed_at: '2026-09-30T00:00:00Z', user: { username: 'leela' } })
              : new HttpResponse(null, { status: action === 'blockRequest' ? 201 : 204 }),
        ),
      );
      expect(await state.change(action)).toBe(true);
      expect(state.overlay.state('leela', empty)).toMatchObject({
        relation: { requestId: 42, followsYou: action === 'approve', blocked: action === 'blockRequest' },
        decision: action === 'blockRequest' ? 'block' : action,
        hideBlock: action !== 'deny',
      });
      expect(await state.change('deny')).toBe(false);
    },
  );

  it('should restore an incoming request after a failed approval', async () => {
    const relation = { ...empty, requestId: 42 };
    const state = setup(relation);
    server.use(http.post(`${base}/users/requests/42`, () => new HttpResponse(null, { status: 404 })));
    expect(await state.change('approve')).toBe(false);
    expect(state.overlay.state('leela', relation)).toMatchObject({ relation, decision: null });
  });

  it('should block and unblock without changing the viewer outgoing follow', async () => {
    const state = setup({ ...empty, follow: 'following', followsYou: true });
    server.use(
      http.post(`${base}/users/leela/block`, () => new HttpResponse(null, { status: 201 })),
      http.delete(`${base}/users/leela/block`, () => new HttpResponse(null, { status: 204 })),
    );
    await state.change('block');
    expect(state.overlay.state('leela', empty)).toMatchObject({
      relation: { follow: 'following', followsYou: false, blocked: true },
      hideBlock: true,
    });
    await state.change('unblock');
    expect(state.overlay.state('leela', empty)).toMatchObject({
      relation: { blocked: false },
      hideBlock: true,
      followerDelta: 0,
    });
  });

  it('should preserve previous successful patches when a subsequent write fails', async () => {
    const state = setup();
    server.use(
      http.post(
        `${base}/users/leela/follow`,
        () => HttpResponse.json({ approved_at: 'now', user: { username: 'leela' } }),
      ),
    );
    await state.change('follow');
    server.use(http.delete(`${base}/users/leela/follow`, () => new HttpResponse(null, { status: 500 })));
    await state.change('unfollow');
    expect(state.overlay.state('leela', empty)).toMatchObject({ relation: { follow: 'following' }, followerDelta: 1 });
  });
  it('should discard a late response after navigation or a viewer change resets the overlay', async () => {
    const state = setup();
    server.use(http.post(`${base}/users/leela/follow`, () => {
      state.overlay.clear();
      return HttpResponse.json({ approved_at: 'now', user: { username: 'leela' } });
    }));
    expect(await state.change('follow')).toBe(false);
    expect(state.overlay.state('leela', empty).relation).toEqual(empty);
    expect(state.overlay.busy('leela')).toBe(false);
    expect(state.notify.error).not.toHaveBeenCalled();
  });
});
