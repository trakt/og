import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadRatings } from './loadRatings.ts';
const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const rows = Array.from(
  { length: 65 },
  (_, i) => ({
    type: 'movie',
    rating: 1 + i % 10,
    rated_at: `2026-09-${String(1 + i % 28).padStart(2, '0')}T00:00:00Z`,
    movie: { ids: { trakt: i + 1, slug: `movie-${i + 1}` }, title: `Movie ${i + 1}` },
  }),
);
const seen: Request[] = [];
const server = setupServer(http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/ratings/, ({ request }) => {
  seen.push(request);
  const url = new URL(request.url);
  return HttpResponse.json(url.searchParams.get('limit') === 'all' ? rows : rows.slice(0, 60), {
    headers: { 'x-pagination-page': '1', 'x-pagination-page-count': '2', 'x-pagination-item-count': '65' },
  });
}));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());
const load = (filters = '', search = '', overrides = {}, token: string | null = null) =>
  loadRatings({
    fetch,
    locals: { token },
    params: { id: 'tester', filters },
    url: new URL(`https://og.trakt.tv/users/tester/ratings${search}`),
    cookies: { get: (name) => name === 'filter-fade-ratings' ? 'rated,bogus' : undefined },
    parent: () => Promise.resolve({ profile: { ...profile, ...overrides }, isSelf: false, datePreferences }),
  });
describe('loadRatings', () => {
  it('should page the native default without a token and honor fade cookies', async () => {
    const result = await load('movies/10', '', {}, 'viewer-token');
    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/tester/ratings/movies/10');
    expect(seen.at(0)?.headers.has('authorization')).toBe(false);
    expect(new URL(seen.at(0)?.url ?? '').searchParams.get('limit')).toBe('60');
    expect(result.total).toBe(65);
    expect(result.cards).toHaveLength(60);
    expect(result.days.length).toBeGreaterThan(0);
    expect(result.fadeHide).toEqual({ fade: ['rated'], hide: [] });
  });
  it('should sort the whole list before taking a page and clamp an excessive page', async () => {
    const result = await load('movies/all/rating/asc', '?page=99');
    expect(new URL(seen.at(0)?.url ?? '').searchParams.get('limit')).toBe('all');
    expect(result.page).toEqual({ type: 'paginated', current: 2, total: 2 });
    expect(result.cards).toHaveLength(5);
    expect(result.cards.every((card) => card.ownerRating === 1)).toBe(true);
    expect(result.days).toEqual([]);
  });
  it('should omit the worker-rejected all stars segment for seasons', async () => {
    await load('seasons/all');
    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/tester/ratings/seasons');
  });
  it('should retry private profiles with the token and leave locked profiles empty', async () => {
    await load('', '', { isPrivate: true }, 'abc');
    expect(seen.map((r) => r.headers.get('authorization'))).toEqual([null, 'Bearer abc']);
    expect((await load('', '', { isLocked: true })).cards).toEqual([]);
  });
  it('should reject malformed proxy bodies and surface API errors', async () => {
    server.use(http.get(/ratings/, () => HttpResponse.json([{ broken: true }], { headers: { 'x-runtime': '0.2' } })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(http.get(/ratings/, () => new HttpResponse(null, { status: 404 })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
  });
});
