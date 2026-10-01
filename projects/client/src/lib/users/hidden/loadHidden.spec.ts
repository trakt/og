import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadHidden } from './loadHidden.ts';
const dates = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const user = { slug: 'tester', firstName: 'Tester', avatarUrl: '', isVip: true };
const seen: Request[] = [];
const server = setupServer(http.get('https://apiz.trakt.tv/users/hidden/:section', ({ request }) => {
  seen.push(request);
  const page = Number(new URL(request.url).searchParams.get('page'));
  return HttpResponse.json([{
    type: 'show',
    hidden_at: '2026-09-27T12:00:00Z',
    show: { title: `Show ${page}`, ids: { trakt: page } },
  }], { headers: { 'x-pagination-page': String(page), 'x-pagination-page-count': '2' } });
}));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());
const load = (type?: string, token: string | null = 'viewer') =>
  loadHidden({
    fetch,
    locals: { token },
    params: { type },
    url: new URL('https://og.trakt.tv/settings/hidden/watched?terms=boys'),
    parent: () => Promise.resolve({ user, datePreferences: dates }),
  });
describe('loadHidden', () => {
  it.each([
    ['watched', 'progress_watched'],
    ['collected', 'progress_collected'],
    ['rewatching', 'progress_watched_reset'],
    ['calendars', 'calendar'],
    ['comments', 'comments'],
    [undefined, 'dropped'],
  ])('should read all pages of %s through the viewer-only %s endpoint', async (type, section) => {
    expect((await load(type)).items).toHaveLength(2);
    expect(seen.every((request) => request.headers.get('authorization') === 'Bearer viewer')).toBe(true);
    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe(`/users/hidden/${section}`);
  });
  it('should redirect logged-out viewers with the full return path and make no API read', async () => {
    await expect(load('watched', null)).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fsettings%2Fhidden%2Fwatched%3Fterms%3Dboys',
    });
    expect(seen).toHaveLength(0);
  });
  it('should render expired sessions without trying to refresh or read public hidden items', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/hidden/:section', () => new HttpResponse(null, { status: 401 })));
    expect(await load()).toMatchObject({ expired: true, items: [] });
  });
  it('should reject a malformed or failed response rather than silently emptying the grid', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/hidden/:section', () => HttpResponse.json([{ bad: true }])));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(http.get('https://apiz.trakt.tv/users/hidden/:section', () => new HttpResponse(null, { status: 503 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
