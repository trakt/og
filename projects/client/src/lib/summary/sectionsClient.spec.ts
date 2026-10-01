import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api } from '../api/api.ts';
import { sectionsClient } from './sectionsClient.ts';
import type { SummaryMedia } from './SummaryMedia.ts';

const API = 'https://apiz.trakt.tv';
const movie: SummaryMedia = { type: 'movie', id: 1, slug: 'deadpool-2016', title: 'Deadpool (2016)' };

const user = (slug: string) => ({ username: slug, private: false, deleted: false, ids: { slug, trakt: 1 } });
const comment = (id: number) => ({
  id,
  parent_id: 0,
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
  comment: 'Great fun.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 1,
  user_stats: { rating: null, play_count: 1, completed_count: 1 },
  user: user('sean'),
});
const list = (id: number, type: string, likes = 0) => ({
  name: `List ${id}`,
  privacy: 'public',
  share_link: '',
  type,
  display_numbers: false,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2020-01-01T00:00:00.000Z',
  item_count: 1,
  comment_count: 0,
  likes,
  ids: { trakt: id, slug: `list-${id}` },
  user: user('sean'),
});

const seen: Request[] = [];
const server = setupServer(
  http.get(`${API}/movies/:id/watching`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([user('watcher')]);
  }),
  http.get(`${API}/movies/:id/social`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ user: user('friend'), watched: { plays: 2, rating: { rating: 9 } } }]);
  }),
  http.get(`${API}/movies/:id/comments/mine`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([comment(3)]);
  }),
  http.get(`${API}/movies/:id/comments/:sort`, ({ request, params }) => {
    seen.push(request);
    return params.sort === 'likes' ? HttpResponse.json([comment(1)]) : HttpResponse.json([], { status: 500 });
  }),
  http.get(`${API}/movies/:id/lists/:type/:sort`, ({ request, params }) => {
    seen.push(request);
    return HttpResponse.json(params.type === 'official' ? [list(10, 'official')] : [list(11, 'personal')]);
  }),
  http.get(`${API}/movies/:id/listed`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([list(20, 'watchlist'), list(21, 'personal', 1), list(22, 'personal', 5)]);
  }),
  http.get(`${API}/movies/:id/related`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ title: 'Deadpool 2', year: 2018, ids: { trakt: 2, slug: 'deadpool-2-2018' } }]);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const viewerFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer viewer');
  return fetch(input, { ...init, headers });
};
const client = (signedIn: boolean) =>
  sectionsClient({ anonymous: api({ fetch }), viewer: api({ fetch: viewerFetch }), viewerFetch, signedIn });
const paths = () => seen.map((request) => new URL(request.url).pathname);

describe('sectionsClient', () => {
  describe('logged out', () => {
    it('should only show watching now, without the token or the social call', async () => {
      const tabs = await client(false).activity(movie);
      expect(tabs?.map(({ id }) => id)).toEqual(['watching']);
      expect(paths()).toEqual(['/movies/deadpool-2016/watching']);
      expect(seen.at(0)?.headers.get('authorization')).toBeNull();
    });

    it('should drop a comment tab whose request failed and skip Me', async () => {
      const tabs = await client(false).comments(movie);
      expect(tabs?.map(({ id, count }) => ({ id, count }))).toEqual([{ id: 'likes', count: 'All Time' }]);
      expect(paths()).not.toContain('/movies/deadpool-2016/comments/mine');
    });
  });

  describe('signed in', () => {
    it('should add the followed members from /social with the token', async () => {
      const tabs = await client(true).activity(movie);
      expect(tabs?.map(({ id }) => id)).toEqual(['watching', 'watched', 'rated']);
      const social = seen.find((request) => request.url.includes('/social'));
      expect(social?.headers.get('authorization')).toBe('Bearer viewer');
      expect(new URL(social?.url ?? '').searchParams.get('limit')).toBe('250');
    });

    it("should read the viewer's own comments into Me", async () => {
      const tabs = await client(true).comments(movie);
      expect(tabs?.map(({ id }) => id)).toEqual(['likes', 'me']);
      expect(tabs?.at(1)?.comments.map(({ id }) => id)).toEqual([3]);
    });

    it('should put official lists first and keep only personal lists in Me, most liked first', async () => {
      const tabs = await client(true).lists(movie);
      expect(tabs?.map(({ id, lists }) => ({ id, lists: lists.map(({ id }) => id) }))).toEqual([
        { id: 'popular', lists: [10, 11] },
        { id: 'me', lists: [22, 21] },
      ]);
    });
  });

  it('should ask for six related items with images', async () => {
    const cards = await client(false).related(movie);
    expect(cards?.map(({ href }) => href)).toEqual(['/movies/deadpool-2-2018']);
    const params = new URL(seen.at(0)?.url ?? '').searchParams;
    expect([params.get('limit'), params.get('extended')]).toEqual(['6', 'full,images']);
  });

  it('should come back null when a section has nothing', async () => {
    server.use(http.get(`${API}/movies/:id/related`, () => HttpResponse.json([])));
    expect(await client(false).related(movie)).toBeNull();
  });
  describe('seasons', () => {
    const season: SummaryMedia = {
      type: 'season',
      id: 3950,
      slug: 'breaking-bad',
      season: 1,
      title: 'Breaking Bad: Season 1',
    };
    const base = `${API}/shows/:id/seasons/:season`;
    const record = (request: Request, rows: unknown[]) => {
      seen.push(request);
      return HttpResponse.json(rows);
    };

    it('should show anonymous watching now and never request the nonexistent social or related routes', async () => {
      server.use(http.get(`${base}/watching`, ({ request }) => record(request, [user('watcher')])));
      expect((await client(true).activity(season))?.map(({ id }) => id)).toEqual(['watching']);
      expect(await client(true).related(season)).toBeNull();
      expect(paths()).toEqual(['/shows/breaking-bad/seasons/1/watching']);
      expect(seen.at(0)?.headers.get('authorization')).toBeNull();
    });

    it('should read season comments, own comments and lists from their season paths', async () => {
      server.use(
        http.get(`${base}/comments/mine`, ({ request }) => record(request, [comment(3)])),
        http.get(`${base}/comments/:sort`, ({ request }) => record(request, [comment(1)])),
        http.get(`${base}/lists/:type/:sort`, ({ request }) => record(request, [list(10, 'personal')])),
        http.get(`${base}/listed`, ({ request }) => record(request, [list(21, 'personal')])),
      );
      expect((await client(true).comments(season))?.map(({ id }) => id)).toEqual(['likes', 'recent', 'me']);
      expect((await client(true).lists(season))?.map(({ id }) => id)).toEqual(['popular', 'me']);
      expect(paths().every((path) => path.startsWith('/shows/breaking-bad/seasons/1/'))).toBe(true);
      expect(
        seen.filter((request) => request.url.includes('/comments/')).every((request) =>
          request.headers.get('authorization') === 'Bearer viewer'
        ),
      ).toBe(true);
      expect(
        seen.filter((request) => request.url.includes('/lists/')).every((request) =>
          !request.headers.has('authorization')
        ),
      ).toBe(true);
    });

    it('should omit malformed off-contract season data instead of rendering it', async () => {
      server.use(
        http.get(`${base}/comments/:sort`, () => HttpResponse.json([])),
        http.get(`${base}/comments/mine`, () => HttpResponse.json([{ id: 'bad' }])),
      );
      expect(await client(true).comments(season)).toBeNull();
    });
  });
  describe('episodes', () => {
    const episode: SummaryMedia = {
      type: 'episode',
      id: 73482,
      slug: 'breaking-bad',
      season: 1,
      episode: 1,
      title: 'Pilot',
    };
    const base = `${API}/shows/:id/seasons/:season/episodes/:episode`;
    it('should use episode paths and viewer credentials only for viewer data', async () => {
      server.use(http.get(`${base}/*`, ({ request }) => {
        seen.push(request);
        const path = new URL(request.url).pathname;
        if (path.endsWith('/watching')) return HttpResponse.json([user('watcher')]);
        if (path.endsWith('/social')) return HttpResponse.json([]);
        if (path.includes('/comments/')) return HttpResponse.json([comment(1)]);
        return HttpResponse.json([list(10, 'personal')]);
      }));
      await client(true).activity(episode);
      await client(true).comments(episode);
      await client(true).lists(episode);
      expect(await client(true).related(episode)).toBeNull();
      expect(paths().every((path) => path.startsWith('/shows/breaking-bad/seasons/1/episodes/1/'))).toBe(true);
      expect(
        seen.filter((request) => request.url.includes('/watching') || request.url.includes('/lists/')).every(
          (request) => !request.headers.has('authorization'),
        ),
      ).toBe(true);
      expect(
        seen.filter((request) =>
          request.url.includes('/social') || request.url.includes('/comments/') || request.url.includes('/listed')
        ).every((request) => request.headers.get('authorization') === 'Bearer viewer'),
      ).toBe(true);
    });
  });
});
