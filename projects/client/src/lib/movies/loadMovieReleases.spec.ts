import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadMovieReleases } from './loadMovieReleases.ts';

const movie = { title: 'Fight Club', year: 1999, ids: { trakt: 1, slug: 'fight-club-1999' }, country: 'us' };
const requests: Request[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/movies/:id', ({ request }) => {
    requests.push(request);
    return HttpResponse.json(movie);
  }),
  http.get('https://apiz.trakt.tv/movies/:id/releases', ({ request }) => {
    requests.push(request);
    return HttpResponse.json([{ country: 'us', release_date: '1999-10-15', release_type: 'limited' }]);
  }),
  // Watch Now: the sidebar renders without it.
  http.get('https://apiz.trakt.tv/*', () => new HttpResponse(null, { status: 404 })),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());
const load = (id = 'fight-club-1999') =>
  loadMovieReleases({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { order: 'ymd', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 },
        settings: null,
        user: null,
      }),
    id,
  });
const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error);

describe('loadMovieReleases', () => {
  it('should load public endpoints without authorization and use the layout date preferences', async () => {
    const data = await load();
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => !request.headers.has('authorization'))).toBe(true);
    expect(data.countries.at(0)?.rows.at(0)?.dateText).toBe('1999 Oct 15');
    expect(data.movie.href).toBe('/movies/fight-club-1999');
  });
  it('should retain the releases subpage on a canonical slug redirect', async () => {
    const thrown = await failure(load('1'));
    expect(isRedirect(thrown) && thrown.location).toBe('/movies/fight-club-1999/releases');
  });
  it('should distinguish a missing movie from a failed release service', async () => {
    server.use(http.get('https://apiz.trakt.tv/movies/:id', () => new HttpResponse(null, { status: 404 })));
    const missing = await failure(load());
    expect(isHttpError(missing) && missing.status).toBe(404);
    server.resetHandlers();
    server.use(http.get('https://apiz.trakt.tv/movies/:id/releases', () => new HttpResponse(null, { status: 500 })));
    const failed = await failure(load());
    expect(isHttpError(failed) && failed.status).toBe(502);
  });
  it('should expose an empty release list for the accessible empty state', async () => {
    server.use(http.get('https://apiz.trakt.tv/movies/:id/releases', () => HttpResponse.json([])));
    expect((await load()).countries).toEqual([]);
  });
});
