import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { changeVisibility } from './changeVisibility.ts';

const API = 'https://apiz.trakt.tv';
const AT = '2026-09-29T12:00:00.000Z';
const target = { type: 'show' as const, id: 1, title: 'Breaking Bad' };
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
async function setup(unknown = false) {
  const overlay = createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: {
      clearExcept: () => Promise.resolve(),
      save: () => Promise.resolve(),
      load: () =>
        Promise.resolve(
          unknown ? [] : [
            { name: 'dropped', activity: '', data: new Set([1, 2]) },
            { name: 'rewatching', activity: '', data: new Map([[2, '2026-01-01']]) },
            {
              name: 'watchedShows',
              activity: '',
              data: new Map([[1, new Map([[1, new Map([[100, ['2026-01-01', '2026-10-01']]])]])]]),
            },
          ],
        ),
    },
  });
  await overlay.start('tester');
  return {
    target,
    overlay,
    notify: { success: vi.fn(), error: vi.fn() },
    now: () => new Date(AT),
    request: (path: string, body: unknown) =>
      rawApiFetch({
        path,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      }),
  };
}

describe('changeVisibility', () => {
  it('should reset progress and restore a dropped show without deleting any history', async () => {
    const params = await setup();
    server.use(http.post(`${API}/shows/1/progress/watched/reset`, async ({ request }) => {
      expect(await request.json()).toEqual({ reset_at: AT });
      expect(params.overlay.state('show', 1)).toMatchObject({
        dropped: false,
        rewatching: true,
        rewatchingAt: AT,
        watchedEpisodes: 1,
        watchedPlays: 2,
        rewatchedEpisodes: 1,
        rewatchedPlays: 1,
      });
      return HttpResponse.json({ reset_at: AT }, { status: 201 });
    }));
    expect(await changeVisibility({ ...params, action: 'rewatch' })).toBe(true);
    expect(params.overlay.state('show', 2)).toMatchObject({ dropped: true, rewatching: true });
  });
  it.each(['drop', 'restore'] as const)('should %s a show with the expected API body', async (action) => {
    const params = await setup();
    server.use(http.post(`${API}/users/hidden/dropped${action === 'restore' ? '/remove' : ''}`, async ({ request }) => {
      expect(await request.json()).toEqual({
        shows: [{ ids: { trakt: 1 }, ...(action === 'drop' ? { hidden_at: AT } : {}) }],
      });
      expect(params.overlay.state('show', 1).dropped).toBe(action === 'drop');
      return HttpResponse.json({ [action === 'restore' ? 'deleted' : 'added']: { shows: 1 } });
    }));
    expect(await changeVisibility({ ...params, action })).toBe(true);
  });
  it.each(['calendar', 'recommendations', 'progress_watched', 'progress_collected'] as const)(
    'should hide a show only in %s',
    async (section) => {
      const params = await setup();
      server.use(http.post(`${API}/users/hidden/${section}`, async ({ request }) => {
        expect(await request.json()).toEqual({ shows: [{ ids: { trakt: 1 }, hidden_at: AT }] });
        expect(params.overlay.isHidden(section, 'show', 1)).toBe(true);
        expect(params.overlay.isHidden(section, 'movie', 1)).toBe(false);
        expect(params.overlay.state('show', 1).dropped).toBe(true);
        return HttpResponse.json({ added: { shows: 1 } });
      }));
      expect(await changeVisibility({ ...params, action: 'hide', section })).toBe(true);
    },
  );
  it.each([403, 429, 500])('should roll back both reset and restore on failure (%s)', async (status) => {
    const params = await setup();
    server.use(http.post(`${API}/shows/1/progress/watched/reset`, () => new HttpResponse(null, { status })));
    expect(await changeVisibility({ ...params, action: 'rewatch' })).toBe(false);
    expect(params.overlay.state('show', 1)).toMatchObject({ dropped: true, rewatching: false });
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
  it.each([{ added: { shows: 0 } }, { added: { shows: 1 }, not_found: { shows: [{ ids: { trakt: 1 } }] } }, {
    wrong: true,
  }])('should reject an unsuccessful or malformed success body', async (body) => {
    const params = await setup(true);
    server.use(http.post(`${API}/users/hidden/dropped`, () => HttpResponse.json(body)));
    expect(await changeVisibility({ ...params, action: 'drop' })).toBe(false);
    expect(params.overlay.state('show', 1).dropped).toBeUndefined();
  });
  it('should roll back hide on a network failure', async () => {
    const params = await setup();
    server.use(http.post(`${API}/users/hidden/calendar`, () => HttpResponse.error()));
    expect(await changeVisibility({ ...params, action: 'hide', section: 'calendar' })).toBe(false);
    expect(params.overlay.isHidden('calendar', 'show', 1)).toBe(false);
  });
  it('should show a saved drop before the library cache arrives', async () => {
    const params = await setup(true);
    server.use(http.post(`${API}/users/hidden/dropped`, () => HttpResponse.json({ added: { shows: 1 } })));
    expect(await changeVisibility({ ...params, action: 'drop', at: '2026-01-01T00:00:00Z' })).toBe(true);
    expect(params.overlay.state('show', 1)).toMatchObject({ dropped: true, droppedAt: '2026-01-01T00:00:00Z' });
  });
  it('should reject show-only actions on movies without sending a request', async () => {
    const params = await setup();
    const request = vi.fn();
    expect(await changeVisibility({ ...params, request, target: { ...target, type: 'movie' }, action: 'drop' })).toBe(
      false,
    );
    expect(request).not.toHaveBeenCalled();
  });
  describe('for a progress season known by its number', () => {
    const season = { type: 'season' as const, id: 1, title: 'Breaking Bad Season 2', season: { show: 1, number: 2 } };

    it('should hide it through its show without patching the hidden slice', async () => {
      const params = await setup();
      server.use(http.post(`${API}/users/hidden/progress_watched`, async ({ request }) => {
        expect(await request.json()).toEqual({
          shows: [{ ids: { trakt: 1 }, seasons: [{ number: 2, hidden_at: AT }] }],
        });
        return HttpResponse.json({ added: { seasons: 1 }, not_found: { shows: [], seasons: [] } });
      }));
      expect(await changeVisibility({ ...params, target: season, action: 'hide', section: 'progress_watched' })).toBe(
        true,
      );
      expect(params.overlay.isHidden('progress_watched', 'season', 1)).toBe(false);
      expect(params.notify.success).toHaveBeenCalledWith('You hid Breaking Bad Season 2.');
    });

    it('should fail when API hid nothing', async () => {
      const params = await setup();
      server.use(http.post(`${API}/users/hidden/progress_collected`, () => HttpResponse.json({ added: { shows: 0 } })));
      expect(await changeVisibility({ ...params, target: season, action: 'hide', section: 'progress_collected' }))
        .toBe(false);
      expect(params.notify.error).toHaveBeenCalledWith('Doh! We ran into some sort of error.');
    });
  });

  it.each(['drop', 'hide'] as const)('should roll back a %s the worker refuses as unauthorized', async (action) => {
    const params = await setup(true);
    const section = action === 'hide' ? 'progress_collected' : 'dropped';
    server.use(http.post(`${API}/users/hidden/${section}`, () => workerUnauthorized()));
    const saved = await changeVisibility({
      ...params,
      action,
      section: action === 'hide' ? 'progress_collected' : undefined,
    });
    expect(saved).toBe(false);
    expect(params.overlay.state('show', 1).dropped).toBeUndefined();
    expect(params.overlay.isHidden('progress_collected', 'show', 1)).toBe(false);
    expect(params.notify.error).toHaveBeenCalledOnce();
  });

  it('should roll back a rewatch the worker refuses as unauthorized', async () => {
    const params = await setup();
    server.use(http.post(`${API}/shows/1/progress/watched/reset`, () => workerUnauthorized()));
    expect(await changeVisibility({ ...params, action: 'rewatch' })).toBe(false);
    expect(params.overlay.state('show', 1)).toMatchObject({ dropped: true, rewatching: false });
  });
});
