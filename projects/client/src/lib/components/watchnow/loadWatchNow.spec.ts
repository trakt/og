import { describe, expect, it } from 'vitest';
import { loadWatchNow } from './loadWatchNow.ts';

const empty = { free: [], subscription: [], cable: [], purchase: [], cinema: [] };
const netflix = { source: 'netflix', link: 'watchnow.trakt.tv/watchnow/1', uhd: false, prices: {} };

const routes: Record<string, unknown> = {
  '/shows/x/watchnow/us?extended=streaming_ranks': { us: { ...empty, streaming_ranks: { rank: 5, link: 'jw' } } },
  '/shows/x/watchnow/favorites/us': [],
  '/shows/x/seasons/1/episodes/1/watchnow/us?extended=streaming_ranks': {
    us: { ...empty, subscription: [netflix] },
  },
  '/shows/x/seasons/1/episodes/1/watchnow/favorites/us': ['us-netflix'],
  '/watchnow/sources/us': [{ us: [{ source: 'netflix', name: 'Netflix', color: '#e50914', images: {} }] }],
};

const fetch = ((url: string) => {
  const body = routes[new URL(url).pathname + new URL(url).search];
  return Promise.resolve(new Response(JSON.stringify(body ?? null), { status: body ? 200 : 404 }));
}) as typeof globalThis.fetch;

describe('loadWatchNow', () => {
  it('falls back to S1E1 when the show has no sources, keeping the show’s rank', async () => {
    const { rank, button } = await loadWatchNow({
      fetch,
      path: '/shows/x',
      fallback: '/shows/x/seasons/1/episodes/1',
      country: 'us',
      settings: null,
      isVip: false,
    });
    expect(rank).toMatchObject({ rank: 5 });
    expect(button).toMatchObject({ path: '/shows/x/seasons/1/episodes/1', count: 1 });
    expect(button.tiles.map(({ name }) => name)).toEqual(['Netflix']);
  });

  it('should show no offers when the responses are malformed', async () => {
    const malformed = ((url: string) => {
      const { pathname } = new URL(url);
      const body = pathname.startsWith('/watchnow/sources')
        ? { us: 'nope' }
        : pathname.includes('favorites')
        ? { order: [] }
        : [{ us: {} }];
      return Promise.resolve(new Response(JSON.stringify(body)));
    }) as typeof globalThis.fetch;

    const { rank, button } = await loadWatchNow({
      fetch: malformed,
      path: '/movies/x',
      country: 'us',
      settings: null,
      isVip: false,
    });
    expect(rank).toBeNull();
    expect(button).toMatchObject({ path: '/movies/x', count: 0, tiles: [], cinemaOnly: false, hidden: false });
  });
});
