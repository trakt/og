import type { HotReleaseResponse } from '@trakt/api';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchSchedule } from './fetchSchedule.ts';
import { scheduleFixture } from './scheduleFixture.ts';

const API = 'https://apiz.trakt.tv';
const NOW = new Date('2026-09-30T08:00:00Z');
const seen: URL[] = [];
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const calendar = (rows: (url: URL) => HotReleaseResponse[]) =>
  http.get(`${API}/calendars/my/media/:start/:days`, ({ request }) => {
    const url = new URL(request.url);
    seen.push(url);
    return HttpResponse.json(rows(url));
  });
const hidden = (rows: unknown[] = []) => http.get(`${API}/users/hidden/calendar`, () => HttpResponse.json(rows));
const watchNow = http.get(`${API}/:type/:id/*`, ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/watchnow\/us$/, '');
  const offers = scheduleFixture.offers.get(path);
  return HttpResponse.json(offers ? { us: offers } : {});
});
const params = {
  // Looked up per call: MSW swaps the global fetch once it listens.
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
  token: 'abc',
  settings: null,
  datePreferences: { timeZone: 'UTC', hour24: false, order: 'mdy' as const },
  isVip: false,
  now: NOW,
};
const calendarRequests = () => seen.filter(({ pathname }) => pathname.startsWith('/calendars/'));

describe('fetchSchedule', () => {
  it('should read one window when it has five days', async () => {
    server.use(calendar(() => scheduleFixture.rows('2026-09-30')), hidden(), watchNow);

    const days = await fetchSchedule(params);

    expect(days).toHaveLength(5);
    expect(calendarRequests().map(({ pathname, searchParams }) => [pathname, searchParams.get('extended')])).toEqual([
      ['/calendars/my/media/2026-09-29/33', 'full,images'],
    ]);
  });

  it('should read the rest of the year at once when the first window is short', async () => {
    const rows = scheduleFixture.rows('2026-09-30').slice(0, 2);
    server.use(
      calendar((url) => (url.pathname.includes('2026-09-29') ? rows : [])),
      hidden(),
      watchNow,
    );

    const days = await fetchSchedule(params);

    expect(days).toHaveLength(1);
    expect(calendarRequests()).toHaveLength(11);
  });

  it('should leave out what the viewer hid and, with the setting, specials', async () => {
    const special = { ...scheduleFixture.rows('2026-09-30')[2], episode: { season: 0, number: 1, ids: { trakt: 9 } } };
    server.use(
      calendar(() => [...scheduleFixture.rows('2026-09-30'), special]),
      hidden([{ type: 'show', show: { title: 'The Boys', ids: { trakt: 139960, slug: 'the-boys-2019' } } }]),
      watchNow,
    );

    const days = await fetchSchedule({
      ...params,
      settings: { browsing: { calendar: { hide_specials: true } } } as never,
    });
    const items = days.flatMap(({ items }) => items);

    expect(items.some(({ title }) => title === 'The Boys')).toBe(false);
    expect(items.some(({ episode }) => episode?.number.startsWith('Special'))).toBe(false);
  });

  it('should look up Watch Now in the viewer country for each shown item', async () => {
    server.use(calendar(() => scheduleFixture.rows('2026-09-30')), hidden(), watchNow);

    const days = await fetchSchedule(params);
    const items = days.flatMap(({ items }) => items);

    expect(items.filter(({ watchNow }) => watchNow).map(({ title }) => title)).toEqual([
      'The Boys',
      'The Boys',
      'Dune: Part Two',
    ]);
  });

  it('should drop an item Watch Now fails for, and keep the rest', async () => {
    server.use(
      calendar(() => scheduleFixture.rows('2026-09-30')),
      hidden(),
      http.get(`${API}/:type/:id/*`, () => new HttpResponse(null, { status: 500 })),
    );

    const days = await fetchSchedule(params);

    expect(days.flatMap(({ items }) => items).some(({ watchNow }) => watchNow)).toBe(false);
    expect(days).toHaveLength(5);
  });

  it('should fail when the calendar does', async () => {
    server.use(
      http.get(`${API}/calendars/my/media/:start/:days`, () => new HttpResponse(null, { status: 500 })),
      hidden(),
    );

    await expect(fetchSchedule(params)).rejects.toBeDefined();
  });

  describe('with the dashboard settings', () => {
    const settingsFor = (schedule: Partial<Parameters<typeof fetchSchedule>[0]['schedule']>) => ({
      ...params,
      schedule: { filter: 'shows-movies', startDay: 'today', poster: 'show', ...schedule } as const,
    });
    const rows = scheduleFixture.rows('2026-09-30');
    const episodeCalendar = (name: string) =>
      http.get(`${API}/calendars/my/shows/${name}/:start/:days`, ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json(rows.filter((row) => row.episode?.episode_type === 'season_premiere'));
      });
    const movieCalendar = http.get(`${API}/calendars/my/movies/:start/:days`, ({ request }) => {
      seen.push(new URL(request.url));
      return HttpResponse.json(rows.filter((row) => row.movie));
    });

    it("should read the filter's episodes and the watchlisted movies", async () => {
      server.use(episodeCalendar('premieres'), movieCalendar, hidden(), watchNow);

      const days = await fetchSchedule(settingsFor({ filter: 'premieres' }));

      const paths = calendarRequests().map(({ pathname }) => pathname);
      expect(paths.slice(0, 2).toSorted()).toEqual([
        '/calendars/my/movies/2026-09-29/33',
        '/calendars/my/shows/premieres/2026-09-29/33',
      ]);
      expect(days.flatMap(({ items }) => items).map(({ title }) => title)).toContain('Dune: Part Two');
    });

    it('should read new shows and finales from their own calendars', async () => {
      server.use(episodeCalendar('new'), episodeCalendar('finales'), movieCalendar, hidden(), watchNow);

      await fetchSchedule(settingsFor({ filter: 'new-shows' }));
      await fetchSchedule(settingsFor({ filter: 'finales' }));

      const paths = calendarRequests().map(({ pathname }) => pathname);
      expect(paths.some((path) => path.startsWith('/calendars/my/shows/new/'))).toBe(true);
      expect(paths.some((path) => path.startsWith('/calendars/my/shows/finales/'))).toBe(true);
    });

    it('should only look 40 days ahead for all my TV shows, as OG did', async () => {
      server.use(calendar(() => []), hidden(), watchNow);

      await fetchSchedule(settingsFor({ filter: 'shows' }));

      expect(calendarRequests()).toHaveLength(2);
      expect(calendarRequests().every(({ pathname }) => pathname.startsWith('/calendars/my/media/'))).toBe(true);
    });

    it('should start on the start day', async () => {
      server.use(calendar(() => scheduleFixture.rows('2026-09-29')), hidden(), watchNow);

      const days = await fetchSchedule(settingsFor({ startDay: 'yesterday' }));

      expect(calendarRequests().at(0)?.pathname).toBe('/calendars/my/media/2026-09-28/33');
      expect(days.at(0)).toMatchObject({ date: '2026-09-29', relative: 'Yesterday' });
    });

    it("should show the wide days' season posters with that setting", async () => {
      const posters: string[] = [];
      server.use(
        calendar(() => rows),
        hidden(),
        http.get(`${API}/shows/:id/seasons`, ({ params: { id } }) => {
          posters.push(String(id));
          return HttpResponse.json([
            {
              number: 5,
              ids: { trakt: 5 },
              images: { poster: [`media.trakt.tv/images/seasons/${id}/posters/medium/5.jpg`] },
            },
          ]);
        }),
        watchNow,
      );

      const days = await fetchSchedule(settingsFor({ poster: 'season' }));
      const boys = days.flatMap(({ items }) => items).find(({ title }) => title === 'The Boys');

      expect(boys?.poster).toBe('https://media.trakt.tv/images/seasons/139960/posters/thumb/5.jpg');
      const wide = days.slice(0, 2).flatMap(({ items }) => items.filter(({ episode }) => episode));
      expect(posters.length).toBeLessThanOrEqual(new Set(wide.map(({ group }) => group)).size);
    });
  });
});
