import { describe, expect, it } from 'vitest';
import type { CachedShow } from './CachedShow.ts';
import { loadCachedShows } from './loadCachedShows.ts';
import { showStore } from './showStore.ts';

const HOUR = 60 * 60_000;

const record = (id: number, overrides: Partial<CachedShow> = {}): CachedShow => ({
  id,
  slug: `show-${id}`,
  title: `Show ${id}`,
  genres: [],
  fetchedAt: 0,
  complete: true,
  ...overrides,
});

const body = (id: number) => ({
  ids: { trakt: id, slug: `show-${id}` },
  title: `Fresh ${id}`,
  aired_episodes: 10,
  images: { poster: [`${id}.jpg`] },
});

/** Answers `/shows/:id?...` from `bodies`, recording each path. */
function api(bodies: Record<number, unknown>) {
  const paths: string[] = [];
  const get = (path: string) => {
    paths.push(path);
    const id = Number(path.split('/').at(2)?.split('?').at(0));
    const found = bodies[id];
    return Promise.resolve(found ? Response.json(found) : new Response('', { status: 404 }));
  };
  return { get, paths };
}

describe('loadCachedShows', () => {
  it('should answer fresh, complete records without a request', async () => {
    const store = showStore<CachedShow>('summaries');
    await store.put([record(1)]);
    const { get, paths } = api({});

    const shows = await loadCachedShows({ ids: [1], store, get, now: () => HOUR });

    expect(shows.get(1)?.title).toBe('Show 1');
    expect(paths).toEqual([]);
  });

  it('should read missing, stale and incomplete shows and save them', async () => {
    const store = showStore<CachedShow>('summaries');
    await store.put([record(2, { fetchedAt: -13 * HOUR }), record(3, { complete: false })]);
    const { get, paths } = api({ 1: body(1), 2: body(2), 3: body(3) });

    const shows = await loadCachedShows({ ids: [1, 2, 3], store, get, now: () => 0 });

    expect(paths).toEqual([
      '/shows/1?extended=full,images',
      '/shows/2?extended=full,images',
      '/shows/3?extended=full,images',
    ]);
    expect([...shows.values()].map(({ title, poster }) => [title, poster])).toEqual([
      ['Fresh 1', '1.jpg'],
      ['Fresh 2', '2.jpg'],
      ['Fresh 3', '3.jpg'],
    ]);
    expect((await store.get([1])).get(1)?.complete).toBe(true);
  });

  it('should keep a stale record when its read fails, and leave out a show it never had', async () => {
    const store = showStore<CachedShow>('summaries');
    await store.put([record(2, { fetchedAt: -13 * HOUR })]);
    const { get } = api({});

    const shows = await loadCachedShows({ ids: [1, 2], store, get, now: () => 0 });

    expect([...shows.keys()]).toEqual([2]);
  });
});
