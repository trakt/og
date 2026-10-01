import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchLastThirtyDays } from './fetchLastThirtyDays.ts';

const API = 'https://apiz.trakt.tv';
const now = new Date('2026-09-30T15:00:00Z');
const seen: Request[] = [];

const genre = {
  play_count: 1,
  genre: { slug: 'drama', name: 'Drama' },
  percentage: 100,
  percentage_row: 100,
  movies: { play_count: 1, ids: [7] },
  shows: { play_count: 0, ids: [] },
  episodes: { play_count: 0, ids: [] },
};
const movie = {
  id: 1,
  watched_at: '2026-09-30T12:00:00.000Z',
  type: 'movie',
  movie: { title: 'Movie', ids: { trakt: 7, slug: 'movie' }, runtime: 100 },
};

const history = (status = 200) =>
  http.get(`${API}/users/me/history/:type`, ({ request, params }) => {
    seen.push(request);
    if (status !== 200) return new HttpResponse(null, { status });
    return HttpResponse.json(params.type === 'movies' ? [movie] : [], { headers: { 'X-Pagination-Page-Count': '1' } });
  });
const genres = (status = 200) =>
  http.get(`${API}/users/me/watched/genres/30`, ({ request }) => {
    seen.push(request);
    return status === 200 ? HttpResponse.json([genre]) : new HttpResponse(null, { status });
  });

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = () =>
  fetchLastThirtyDays({
    fetch: (...args) => globalThis.fetch(...args),
    token: 'abc',
    slug: 'sean',
    timeZone: 'UTC',
    now,
  });

describe('fetchLastThirtyDays', () => {
  it("should read the viewer's 30-day history and genres with the token", async () => {
    server.use(history(), genres());

    const last = await load();

    const historyUrl = new URL(seen.find(({ url }) => url.includes('/history/movies'))?.url ?? '');
    expect(historyUrl.searchParams.get('start_at')).toBe('2026-08-31T00:00:00.000Z');
    expect(historyUrl.searchParams.get('extended')).toBe('full');
    expect(seen.every((request) => request.headers.get('authorization') === 'Bearer abc')).toBe(true);
    expect(last.time).toBe('1h 40m');
    expect(last.days.at(-1)?.counts).toEqual(['1 movie']);
    expect(last.genres.map(({ name }) => name)).toEqual(['Drama']);
  });

  it('should fail when the history fails, so the panel shows its error', async () => {
    server.use(history(500), genres());

    await expect(load()).rejects.toThrow();
  });

  it('should go without the genres when only they fail', async () => {
    server.use(history(), genres(502));

    const last = await load();

    expect(last.genres).toEqual([]);
    expect(last.days).toHaveLength(30);
  });
});
