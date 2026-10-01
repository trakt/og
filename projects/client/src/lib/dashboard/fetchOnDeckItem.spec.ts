import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toOnDeckItem } from '../progress/toOnDeckItem.ts';
import { upNextFixture } from '../progress/upNextFixture.ts';
import { fetchOnDeckItem } from './fetchOnDeckItem.ts';
import { toDashboardSettings } from './toDashboardSettings.ts';

const entry = upNextFixture.entries.at(0);
if (!entry) throw new Error('Missing fixture');
const initial = toOnDeckItem({ entry, username: 'tester' });
if (!initial) throw new Error('Missing card');
const item = initial;
const API = 'https://apiz.trakt.tv';
const calls: Request[] = [];
const server = setupServer(
  http.get(`${API}/sync/progress/up_next`, ({ request }) => {
    calls.push(request);
    return HttpResponse.json([{
      ...entry,
      progress: {
        ...entry.progress,
        next_episode: { ...entry.progress.next_episode, number: 6, title: 'Next episode', ids: { trakt: 200 } },
      },
    }]);
  }),
  http.get(`${API}/shows/1388`, ({ request }) => {
    calls.push(request);
    return HttpResponse.json({ ...entry.show, status: 'ended' });
  }),
  http.get(`${API}/shows/1388/progress/watched`, ({ request }) => {
    calls.push(request);
    return HttpResponse.json({
      ...entry.progress,
      completed: entry.progress.aired,
      next_episode: null,
      seasons: [{ number: 2, episodes: [{ number: 5, completed: true }, { number: 6, completed: false }] }],
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  calls.length = 0;
});
afterAll(() => server.close());
const authorized: typeof fetch = (input, init) =>
  fetch(input, { ...init, headers: { ...init?.headers, Authorization: 'Bearer fake' } });
const refresh = () => fetchOnDeckItem({ item, username: 'tester', fetch: authorized });

describe('fetchOnDeckItem', () => {
  it('should swap just the watched show to its next episode and preserve its links', async () => {
    expect(await refresh()).toMatchObject({
      episodeId: 200,
      episodeNumber: '2x06',
      episodeTitle: 'Next episode',
      showId: 1388,
    });
    expect(calls).toHaveLength(2);
    expect(calls.at(0)?.headers.get('authorization')).toBe('Bearer fake');
  });
  it('should preserve season posters and exact or simple progress when swapping episodes', async () => {
    server.use(http.get(`${API}/shows/1388/seasons`, ({ request }) => {
      expect(request.headers.get('authorization')).toBeNull();
      return HttpResponse.json([{ number: 2, ids: { trakt: 2 }, images: { poster: ['images.trakt.tv/season.jpg'] } }]);
    }));
    const settings = { ...toDashboardSettings({ settings: null }).upNext, poster: 'season' as const };
    expect(await fetchOnDeckItem({ item, username: 'tester', fetch: authorized, settings })).toMatchObject({
      poster: 'https://images.trakt.tv/season.jpg',
      ticks: [true, false],
    });
    expect(
      (await fetchOnDeckItem({
        item,
        username: 'tester',
        fetch: authorized,
        settings: { ...settings, simpleProgress: true },
      })).ticks,
    ).toBeUndefined();
  });
  it('should find a rewatch beyond the first page and keep lifetime progress', async () => {
    server.use(http.get(`${API}/sync/progress/up_next`, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page');
      return HttpResponse.json(
        page === '1'
          ? []
          : [{ ...entry, progress: { ...entry.progress, completed: 0, reset_at: '2026-09-30T12:00:00Z' } }],
        { headers: { 'X-Pagination-Page-Count': '2' } },
      );
    }));
    expect(await refresh()).toMatchObject({
      rewatching: true,
      progress: { completed: 0 },
      fullProgress: { completed: entry.progress.aired },
    });
  });
  it('should retain a completed show with its status and avoid authenticating its public summary', async () => {
    server.use(http.get(`${API}/sync/progress/up_next`, () => HttpResponse.json([])));
    expect(await refresh()).toMatchObject({
      complete: true,
      completionLabel: 'Ended',
      progress: { completed: 62, aired: 62 },
    });
    expect(calls.find((request) => new URL(request.url).pathname === '/shows/1388')?.headers.get('authorization'))
      .toBeNull();
  });
  it('should say Returns next season for a continuing show', async () => {
    server.use(
      http.get(`${API}/sync/progress/up_next`, () => HttpResponse.json([])),
      http.get(`${API}/shows/1388`, () => HttpResponse.json({ ...entry.show, status: 'returning series' })),
    );
    expect((await refresh()).completionLabel).toBe('Returns next season!');
  });
  it('should leave the current card available for retry when refresh fails or a partial show is filtered', async () => {
    server.use(http.get(`${API}/sync/progress/up_next`, () => new HttpResponse(null, { status: 503 })));
    await expect(refresh()).rejects.toThrow();
    server.use(
      http.get(`${API}/sync/progress/up_next`, () => HttpResponse.json([])),
      http.get(`${API}/shows/1388/progress/watched`, () => HttpResponse.json(entry.progress)),
    );
    await expect(refresh()).rejects.toThrow('Show is no longer in Up Next');
  });
});
