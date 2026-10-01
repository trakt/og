import { describe, expect, it } from 'vitest';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import { showStore } from '../../shows/cache/showStore.ts';
import { loadProgressShows } from './loadProgressShows.ts';

const show = (id: number, images?: unknown) => ({
  ids: { trakt: id, slug: `show-${id}` },
  title: `Show ${id}`,
  aired_episodes: 10,
  ...(images ? { images } : {}),
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Answers bulk reads from `pages` by path prefix, and `/shows/:id` with a show. */
function api(pages: Record<string, unknown[][] | 'fail'>) {
  const paths: string[] = [];
  const get = (path: string) => {
    paths.push(path);
    const prefix = Object.keys(pages).find((key) => path.startsWith(key));
    if (prefix) {
      const found = pages[prefix];
      if (found === 'fail') return Promise.resolve(new Response('', { status: 500 }));
      const page = Number(new URL(path, 'https://apiz').searchParams.get('page'));
      return Promise.resolve(
        Response.json(found?.[page - 1] ?? [], { headers: { 'X-Pagination-Page-Count': String(found?.length) } }),
      );
    }
    const id = Number(path.split('/').at(2)?.split('?').at(0));
    return Promise.resolve(Response.json(show(id, { poster: [`${id}.jpg`] })));
  };
  return { get, paths };
}

const watched = new Set(range(1, 30));

describe('loadProgressShows', () => {
  it('should read many stale watched shows in bulk and the rest one at a time', async () => {
    const store = showStore<CachedShow>('summaries');
    const { get, paths } = api({
      '/users/sean/watched/shows': [
        range(1, 25).map((id) => ({ show: show(id) })),
        range(26, 30).map((id) => ({ show: show(id) })),
      ],
    });

    const shows = await loadProgressShows({
      slug: 'sean',
      ids: [...range(1, 30), 99],
      watched,
      watchlistOnly: new Set(),
      store,
      get,
      publicGet: get,
      now: () => 0,
    });

    expect(paths).toEqual([
      '/users/sean/watched/shows?extended=full&limit=250&page=1',
      '/users/sean/watched/shows?extended=full&limit=250&page=2',
      '/shows/99?extended=full,images',
    ]);
    expect(shows.size).toBe(31);
    expect(shows.get(1)?.complete).toBe(false);
    expect(shows.get(99)?.poster).toBe('99.jpg');
  });

  it('should fall back to single reads for stale shows when a bulk read fails', async () => {
    const store = showStore<CachedShow>('summaries');
    const { get, paths } = api({ '/users/sean/watched/shows': 'fail' });

    const shows = await loadProgressShows({
      slug: 'sean',
      ids: range(1, 30),
      watched,
      watchlistOnly: new Set(),
      store,
      get,
      publicGet: get,
      now: () => 0,
    });

    expect(paths.filter((path) => path.startsWith('/shows/'))).toHaveLength(30);
    expect(shows.size).toBe(30);
  });

  it('should read nothing when every summary is fresh', async () => {
    const store = showStore<CachedShow>('summaries');
    await store.put([{ id: 1, slug: 'a', title: 'A', genres: [], fetchedAt: 0, complete: false }]);
    const { get, paths } = api({});

    await loadProgressShows({
      slug: 'sean',
      ids: [1],
      watched,
      watchlistOnly: new Set(),
      store,
      get,
      publicGet: get,
      now: () => 1,
    });

    expect(paths).toEqual([]);
  });
});
