import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../api/workerUnauthorized.ts';
import { loadCalendar } from './loadCalendar.ts';

const API = 'https://apiz.trakt.tv';
const NOW = new Date('2026-09-29T12:00:00.000Z');

const show = (trakt: number, country = 'us') => ({
  title: `Show ${trakt}`,
  country,
  network: 'FX',
  ids: { trakt, slug: `show-${trakt}` },
});
const airing = (trakt: number, season: number, first_aired = '2026-09-30T01:00:00.000Z') => ({
  first_aired,
  show: show(trakt),
  episode: { season, number: 1, title: 'Pilot', ids: { trakt: trakt * 100 + season } },
});
const release = (trakt: number) => ({
  released: '2026-10-01',
  movie: { title: `Movie ${trakt}`, year: 2026, ids: { trakt, slug: `movie-${trakt}` } },
});

const seen: Request[] = [];
const hidden = [
  { hidden_at: '2026-01-01T00:00:00.000Z', type: 'show', show: { title: 'Show 2', ids: { trakt: 2 } } },
  { hidden_at: '2026-01-01T00:00:00.000Z', type: 'movie', movie: { title: 'Movie 8', ids: { trakt: 8 } } },
];

const server = setupServer(
  http.get(`${API}/calendars/:target/media/:start/:days`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([airing(1, 1), airing(2, 1), release(7), release(8)]);
  }),
  http.get(`${API}/calendars/:target/shows/:start/:days`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([airing(1, 1), airing(1, 0), airing(2, 1)]);
  }),
  http.get(`${API}/calendars/:target/movies/:start/:days`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([release(7), release(8)]);
  }),
  http.get(`${API}/users/hidden/calendar`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(hidden, { headers: { 'X-Runtime': '0.01' } });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

type Options = {
  target?: 'all' | 'my';
  slug?: string;
  token?: string | null;
  timeZone?: string;
  hideSpecials?: boolean;
  feedToken?: string;
  cookies?: Record<string, string>;
  calendar?: Record<string, unknown>;
  start?: string;
  search?: string;
  /** The token stopped working, so the root layout loaded no settings. */
  stale?: boolean;
};

const load = (
  {
    target = 'my',
    slug = 'shows-movies',
    token = 'fake-token',
    timeZone = 'UTC',
    hideSpecials,
    feedToken,
    cookies = {},
    calendar = {},
    start,
    search = '',
    stale = false,
  }: Options,
) =>
  loadCalendar({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { timeZone },
        settings: stale ? null : {
          user: { vip: true },
          account: { token: feedToken },
          browsing: { calendar: { hide_specials: hideSpecials, ...calendar } },
        },
      }),
    url: new URL(`https://og.test/calendars/${target === 'my' ? 'my/' : ''}${slug}${search}`),
    target,
    slug,
    start,
    token,
    cookies: { get: (name) => cookies[name] },
    sidenavHidden: false,
    now: NOW,
  });

const shownKeys = (data: Awaited<ReturnType<typeof load>>) =>
  data.days.flatMap(({ items }) =>
    items.map((
      item,
    ) => (item.type === 'movie' ? `m${item.movie.ids.trakt}` : `${item.show.ids.trakt}s${item.episode.season}`))
  );

const redirectOf = (promise: Promise<unknown>) =>
  promise.then(() => null, (thrown: unknown) => (isRedirect(thrown) ? thrown.location : thrown));

const requestTo = (path: string) => seen.find((request) => new URL(request.url).pathname.startsWith(path));

describe('loadCalendar', () => {
  it.each(['2026-13-45', '2026-13-01', '0000-00-00'])(
    'should load this week for the impossible date %s on public and My calendars',
    async (start) => {
      for (const target of ['all', 'my'] as const) {
        const data = await load({ target, slug: 'movies', token: target === 'my' ? 'fake-token' : null, start });
        expect(data.window.start).toBe(data.today);
        expect(data.window.dates).toHaveLength(7);
        expect(shownKeys(data)).toEqual(target === 'my' ? ['m7'] : ['m7', 'm8']);
        expect(new URL(requestTo(`/calendars/${target}/movies/`)?.url ?? '').pathname)
          .toBe(`/calendars/${target}/movies/2026-09-27/10`);
      }
    },
  );

  it('should send supported filters to the API and apply terms locally without removing dates', async () => {
    const data = await load({
      target: 'all',
      slug: 'movies',
      token: null,
      search:
        '?query=Movie%208&genres=+drama,+comedy&ratings=70-100&episode_types=series_premiere&status=ended&years=2000-2010',
    });
    const request = requestTo('/calendars/all/movies/');
    const search = new URL(request?.url ?? '').searchParams;
    expect(search.get('genres')).toBe('drama,comedy');
    expect(search.get('genres_operator')).toBe('and');
    expect(search.get('ratings')).toBe('70-100');
    for (const key of ['query', 'episode_types', 'statuses', 'years']) expect(search.has(key)).toBe(false);
    expect(request?.headers.get('authorization')).toBeNull();
    expect(shownKeys(data)).toEqual(['m8']);
    expect(data.days).toHaveLength(7);
    expect(data.filters.episode_types.values).toEqual([]);
  });

  it('should apply episode types on SSR and read the shared upsell dismissal', async () => {
    const data = await load({
      slug: 'shows',
      search: '?episode_types=-standard',
      cookies: { hide_advanced_filters_upsell: '1' },
    });
    expect(shownKeys(data)).toEqual([]);
    expect(data.upsellHidden).toBe(true);
    expect(new URL(requestTo('/calendars/my/shows/')?.url ?? '').searchParams.has('episode_types')).toBe(false);
  });

  it('should use the token for watch now on a public calendar, falling back after a 401', async () => {
    server.use(
      http.get(`${API}/calendars/all/movies/:start/:days`, ({ request }) => {
        seen.push(request);
        return request.headers.has('authorization')
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json([release(7)]);
      }),
      http.get(`${API}/watchnow/sources/us`, () => HttpResponse.json([])),
    );
    const data = await load({ target: 'all', slug: 'movies', search: '?watchnow=netflix' });
    const requests = seen.filter((request) => new URL(request.url).pathname.startsWith('/calendars/all/movies/'));
    expect(requests.map((request) => request.headers.get('authorization'))).toEqual(['Bearer fake-token', null]);
    expect(requests.every((request) => new URL(request.url).searchParams.get('watchnow') === 'netflix')).toBe(true);
    expect(data.filters.watchnow).toEqual(['netflix']);
    expect(shownKeys(data)).toEqual(['m7']);
  });

  it("should read the eye menu's calendar cookies and drop unknown options", async () => {
    const data = await load({
      cookies: { 'filter-fade-calendars': 'watched,bogus', 'filter-hide-calendars': 'rated' },
    });

    expect(data.fadeHide).toEqual({ fade: ['watched'], hide: ['rated'] });
  });

  it('should honor shared monthly settings, cap requests and keep filler days empty', async () => {
    const data = await load({
      start: '2026-08-12',
      calendar: { period: 'month', layout: 'grid', start_day: 'monday', image_type: 'poster' },
    });
    const requests = seen.filter((request) => new URL(request.url).pathname.startsWith('/calendars/my/media'));
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      '/calendars/my/media/2026-07-30/17',
      '/calendars/my/media/2026-08-17/16',
    ]);
    expect(requests.every((request) => new URL(request.url).searchParams.get('extended') === 'full,images')).toBe(true);
    expect(data.days).toHaveLength(42);
    expect(data.days.filter((day) => day.filler)).toHaveLength(11);
    expect(data.days.filter((day) => day.filler).every((day) => day.items.length === 0)).toBe(true);
    expect(data.preferences.imageType).toBe('poster');
  });

  it("should fetch each day of a month once, since the worker's days=N covers N + 1 days", async () => {
    await load({ start: '2026-08-12', calendar: { period: 'month' } });
    const covered = seen
      .map((request) => new URL(request.url).pathname.split('/'))
      .filter((parts) => parts.at(3) === 'media')
      .flatMap((parts) => {
        const start = new Date(`${parts.at(4)}T00:00:00Z`);
        return Array.from({ length: Number(parts.at(5)) + 1 }, (_, i) => {
          const day = new Date(start);
          day.setUTCDate(day.getUTCDate() + i);
          return day.toISOString().slice(0, 10);
        });
      });

    expect(covered).toHaveLength(35);
    expect(new Set(covered).size).toBe(35);
    expect([covered.at(0), covered.at(-1)]).toEqual(['2026-07-30', '2026-09-02']);
  });

  it('should use the viewer date before applying the start-day setting', async () => {
    const data = await load({ timeZone: 'Pacific/Kiritimati', calendar: { start_day: 'yesterday' } });
    expect(data.today).toBe('2026-09-30');
    expect(data.window.start).toBe('2026-09-29');
  });

  describe('for My calendars', () => {
    it('should build subscriptions from parent settings without using the OAuth token', async () => {
      const data = await load({ feedToken: 'calendar-token' });
      expect(data.feedUrls['shows-movies']).toBe('https://apiz.trakt.tv/calendars/my/media.ics?slurm=calendar-token');
      expect(data.feedUrls.premieres).toBe(
        'https://apiz.trakt.tv/calendars/my/shows/premieres.ics?slurm=calendar-token',
      );
      expect(seen.some((request) => new URL(request.url).pathname.endsWith('.ics'))).toBe(false);
    });

    it("should read the viewer's merged feed with the token and leave out what they hid", async () => {
      const data = await load({});

      const calendar = requestTo('/calendars/my/media/');
      expect(new URL(calendar?.url ?? '').pathname).toBe('/calendars/my/media/2026-09-27/10');
      expect(calendar?.headers.get('authorization')).toBe('Bearer fake-token');
      expect(requestTo('/users/hidden/calendar')?.headers.get('authorization')).toBe('Bearer fake-token');
      expect(data.calendar.label).toBe('Shows & Movies');
      expect(data.target).toBe('my');
      expect(shownKeys(data)).toEqual(['1s1', 'm7']);
    });

    it('should drop specials only with the setting on', async () => {
      expect(shownKeys(await load({ slug: 'shows', hideSpecials: false }))).toEqual(['1s1', '1s0']);
      expect(shownKeys(await load({ slug: 'shows', hideSpecials: true }))).toEqual(['1s1']);
    });

    it("should put a US show on the viewer's own prime time", async () => {
      const data = await load({ slug: 'shows', timeZone: 'America/Los_Angeles', hideSpecials: true });

      // 9:00 pm Eastern on the 29th is 9:00 pm Pacific on the 29th, not 6:00 pm.
      const day = data.days.find(({ items }) => items.length > 0);
      expect(day?.date).toBe('2026-09-29');
      expect(day?.items.at(0)?.at).toBe('2026-09-30T04:00:00.000Z');
    });

    it('should show everything when the hidden items fail to load', async () => {
      server.use(http.get(`${API}/users/hidden/calendar`, () => new HttpResponse(null, { status: 500 })));
      expect(shownKeys(await load({ slug: 'movies' }))).toEqual(['m7', 'm8']);

      server.use(http.get(`${API}/users/hidden/calendar`, () => HttpResponse.json({ not: 'a list' })));
      expect(shownKeys(await load({ slug: 'movies' }))).toEqual(['m7', 'm8']);
    });

    it('should send a signed-out viewer to sign in without calling the API', async () => {
      expect(await redirectOf(load({ token: null }))).toBe('/auth/signin?redirect_to=%2Fcalendars%2Fmy%2Fshows-movies');
      expect(seen).toHaveLength(0);
    });

    it("should send a viewer whose token stopped working to sign in on the worker's plain-text 401", async () => {
      server.use(
        http.get(`${API}/calendars/my/media/:start/:days`, () => workerUnauthorized()),
        http.get(`${API}/users/hidden/calendar`, () => workerUnauthorized()),
      );
      expect(await redirectOf(load({ stale: true }))).toBe('/auth/signin?redirect_to=%2Fcalendars%2Fmy%2Fshows-movies');
    });

    it('should 404 a calendar OG never had', async () => {
      const thrown = await load({ slug: 'subscriptions' }).catch((e: unknown) => e);
      expect(isHttpError(thrown) && thrown.status).toBe(404);
    });
  });

  it('should redirect when either monthly chunk reports an expired viewer token', async () => {
    server.use(http.get(`${API}/calendars/my/media/2026-08-17/16`, () => new HttpResponse(null, { status: 401 })));
    expect(await redirectOf(load({ start: '2026-08-12', calendar: { period: 'month' } })))
      .toBe('/auth/signin?redirect_to=%2Fcalendars%2Fmy%2Fshows-movies');
  });

  it('should use defaults for a signed-out viewer even if parent settings are populated', async () => {
    const data = await load({
      target: 'all',
      slug: 'movies',
      token: null,
      calendar: { period: 'month', image_type: 'none' },
    });
    expect(data.window.dates).toHaveLength(7);
    expect(data.preferences.imageType).toBe('logo');
  });

  describe('for All calendars', () => {
    it('should read the calendar without the token but still leave out what the viewer hid', async () => {
      const data = await load({ target: 'all', slug: 'movies' });

      const calendar = requestTo('/calendars/all/movies/');
      expect(calendar?.headers.get('authorization')).toBeNull();
      expect(requestTo('/users/hidden/calendar')?.headers.get('authorization')).toBe('Bearer fake-token');
      expect(shownKeys(data)).toEqual(['m7']);
    });

    it('should render All Shows logged-out, short feed and all, for a token that stopped working', async () => {
      server.use(
        http.get(`${API}/users/hidden/calendar`, () => workerUnauthorized()),
        http.get(`${API}/calendars/releases/hot/:start/:days`, ({ request }) => {
          seen.push(request);
          return HttpResponse.json([airing(2, 1)]);
        }),
      );
      const data = await load({ target: 'all', slug: 'shows', stale: true });

      expect(requestTo('/calendars/all/shows/')).toBeUndefined();
      expect(requestTo('/calendars/releases/hot/')?.headers.get('authorization')).toBeNull();
      expect(shownKeys(data)).toEqual(['2s1']);
    });

    it('should skip the hidden items when signed out', async () => {
      server.use(http.get(`${API}/calendars/releases/hot/:start/:days`, ({ request }) => {
        seen.push(request);
        return HttpResponse.json([airing(2, 1)]);
      }));
      const data = await load({ target: 'all', slug: 'shows', token: null });

      expect(requestTo('/users/hidden/calendar')).toBeUndefined();
      expect(shownKeys(data)).toEqual(['2s1']);
    });
  });
});
