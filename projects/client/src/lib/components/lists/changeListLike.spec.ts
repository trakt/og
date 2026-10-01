import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { changeListLike } from './changeListLike.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const state = () => {
  let selected = false;
  const notify = vi.fn();
  const patch = () => {
    selected = true;
    return () => {
      selected = false;
    };
  };
  return { patch, notify, selected: () => selected };
};

describe('changeListLike', () => {
  it.each([true, false])(
    'should %s a personal list at its owner route and retain the optimistic state',
    async (liked) => {
      const ui = state();
      server.use(http.all('https://apiz.trakt.tv/users/other%20user/lists/7/like', ({ request }) => {
        expect(request.method).toBe(liked ? 'POST' : 'DELETE');
        expect(ui.selected()).toBe(true);
        expect(request.headers.get('trakt-api-key')).toBeTruthy();
        return new HttpResponse(null, { status: 204 });
      }));
      expect(await changeListLike({ fetch, id: 7, ownerSlug: 'other user', liked, ...ui })).toBe(true);
      expect(ui.selected()).toBe(true);
      expect(ui.notify).not.toHaveBeenCalled();
    },
  );
  it('should use the numeric route for an official list', async () => {
    server.use(http.post('https://apiz.trakt.tv/lists/9/like', () => new HttpResponse(null, { status: 201 })));
    expect(await changeListLike({ fetch, id: 9, liked: true, ...state() })).toBe(true);
  });
  it.each([401, 403, 409, 429, 500])('should roll back a failed %i write and show its explanation', async (status) => {
    server.use(
      http.post('https://apiz.trakt.tv/lists/7/like', () => HttpResponse.json({ message: 'Unavailable' }, { status })),
    );
    const ui = state();
    expect(await changeListLike({ fetch, id: 7, liked: true, ...ui })).toBe(false);
    expect(ui.selected()).toBe(false);
    expect(ui.notify).toHaveBeenCalledWith('Unavailable');
  });
  it('should roll back a malformed successful body', async () => {
    server.use(http.post('https://apiz.trakt.tv/lists/7/like', () => HttpResponse.json({ message: 42 })));
    const ui = state();
    expect(await changeListLike({ fetch, id: 7, liked: true, ...ui })).toBe(false);
    expect(ui.selected()).toBe(false);
  });
  it('should roll back a network failure', async () => {
    server.use(http.post('https://apiz.trakt.tv/lists/7/like', () => HttpResponse.error()));
    const ui = state();
    expect(await changeListLike({ fetch, id: 7, liked: true, ...ui })).toBe(false);
    expect(ui.selected()).toBe(false);
  });
});
