import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { loadCredits } from './loadCredits.ts';
import { api } from '../api/api.ts';
import { toHeaderUser } from '../components/header/toHeaderUser.ts';
import { toDatePreferences } from '../settings/toDatePreferences.ts';

const API = 'https://apiz.trakt.tv';
const show = { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, slug: 'breaking-bad', tvdb: 81189 } };
const episode = (season: number, number: number, title: string) => ({
  season,
  number,
  title,
  ids: { trakt: season * 100 + number },
  first_aired: '2008-01-20T02:00:00.000Z',
});
const actor = (trakt: number, name: string) => ({
  person: { name, ids: { trakt, slug: name.toLowerCase().replace(/ /g, '-') } },
  characters: [name],
});
const requests: URL[] = [];
const server = setupServer(
  http.get(`${API}/shows/:id`, () => HttpResponse.json(show)),
  http.get(`${API}/shows/:id/seasons`, ({ request }) =>
    HttpResponse.json(
      new URL(request.url).searchParams.get('extended') === 'episodes'
        ? [
          { number: 1, episodes: [episode(1, 1, 'Pilot'), episode(1, 2, "Cat's in the Bag...")] },
          { number: 2, episodes: [episode(2, 1, 'Seven Thirty-Seven')] },
        ]
        : [{ number: 1, ids: { trakt: 3950 }, first_aired: '2008-01-20T02:00:00.000Z' }],
    )),
  http.get(`${API}/shows/:id/seasons/:season/episodes/:episode`, () => HttpResponse.json(episode(1, 2, 'Cat'))),
  http.get(`${API}/shows/:id/seasons/:season/people`, () => HttpResponse.json({ cast: [actor(1, 'Bryan Cranston')] })),
  http.get(`${API}/shows/:id/seasons/:season/episodes/:episode/people`, () =>
    HttpResponse.json({
      cast: [actor(1, 'Bryan Cranston'), actor(2, 'Max Arciniega')],
      crew: { writing: [{ ...actor(3, 'Vince Gilligan'), jobs: ['Writer'] }] },
    })),
  // Watch Now: the sidebar renders without it.
  http.get(`${API}/*`, () => new HttpResponse(null, { status: 404 })),
);
server.events.on('request:start', ({ request }) => void requests.push(new URL(request.url)));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

const load = (item: SubpageItem) =>
  loadCredits({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        datePreferences: { order: 'ymd', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
        settings: null,
        user: null,
      }),
    item,
  });
const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error);

describe('loadCredits', () => {
  describe('for episodes', () => {
    it("should pair the season's regulars with the episode's whole cast, and arrows to the sibling credits", async () => {
      const data = await load({ type: 'episode', id: 'breaking-bad', season: '1', episode: '2' });

      expect(data.credits.actors.map(({ label, people }) => [label, people.map(({ name }) => name)])).toEqual([
        ['Season Regulars', ['Bryan Cranston']],
        ['Guest Stars', ['Bryan Cranston', 'Max Arciniega']],
      ]);
      expect(data.credits.crew.map(({ label }) => label)).toEqual(['Writing']);
      expect(data.media).toMatchObject({ title: '1x02 Cat', href: '/shows/breaking-bad/seasons/1/episodes/2' });
      expect(data.previous?.href).toBe('/shows/breaking-bad/seasons/1/episodes/1/credits');
      expect(data.next?.href).toBe('/shows/breaking-bad/seasons/2/episodes/1/credits');
      const people = requests.filter(({ pathname }) => pathname.endsWith('/people'));
      expect(people.map(({ searchParams }) => searchParams.get('extended'))).toEqual(['images', 'images']);
    });
  });

  describe('for seasons', () => {
    it('should honor the shared actor-spoiler preference for cast and crew counts', async () => {
      server.use(
        http.get(`${API}/shows/:id/seasons/:season/people`, () =>
          HttpResponse.json({
            cast: [{ ...actor(1, 'Bryan Cranston'), episode_count: 7 }],
            crew: { writing: [{ ...actor(2, 'Vince Gilligan'), jobs: ['Writer'], episode_count: 7 }] },
          })),
        http.get(`${API}/users/settings`, () =>
          HttpResponse.json({
            user: {
              username: 'og_tester',
              vip: false,
              ids: { slug: 'og_tester' },
              images: { avatar: { full: 'https://example.test/avatar.png' } },
            },
            browsing: { spoilers: { actors: 'hide' } },
          })),
      );
      const data = await loadCredits({
        fetch,
        item: { type: 'season', id: 'breaking-bad', season: '1' },
        parent: async () => {
          const response = await api({ fetch, token: 'fixture' }).users.settings({ query: { extended: 'browsing' } });
          if (response.status !== 200) throw new Error('Missing viewer fixture');
          return {
            settings: response.body,
            user: toHeaderUser(response.body.user),
            datePreferences: toDatePreferences(response.body),
          };
        },
      });
      expect(data.credits.actors.at(0)?.people.at(0)?.episodes).toBeUndefined();
      expect(data.credits.crew.at(0)?.people.at(0)?.episodes).toBeUndefined();
      expect(requests.filter(({ pathname }) => pathname === '/users/settings')).toHaveLength(1);
    });

    it('should ask for guest stars and 404 a season the show lacks', async () => {
      server.use(
        http.get(
          `${API}/shows/:id/seasons/:season/people`,
          () => HttpResponse.json({ cast: [actor(1, 'Bryan Cranston')], guest_stars: [actor(2, 'Max Arciniega')] }),
        ),
      );
      const data = await load({ type: 'season', id: 'breaking-bad', season: '1' });

      expect(data.credits.actors.map(({ label }) => label)).toEqual(['Season Regulars', 'Guest Stars']);
      expect(requests.find(({ pathname }) => pathname.endsWith('/people'))?.searchParams.get('extended'))
        .toBe('guest_stars,images');
      const missing = await failure(load({ type: 'season', id: 'breaking-bad', season: '7' }));
      expect(isHttpError(missing) && missing.status).toBe(404);
    });
  });

  it('should keep the credits subpage on a canonical slug redirect', async () => {
    const thrown = await failure(load({ type: 'show', id: '1388' }));
    expect(isRedirect(thrown) && thrown.location).toBe('/shows/breaking-bad/credits');
  });
});
