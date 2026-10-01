import { describe, expect, it } from 'vitest';
import { loadShowCatalog } from './loadShowCatalog.ts';
import type { ShowCatalog } from './ShowCatalog.ts';
import { showStore } from './showStore.ts';

const HOUR = 60 * 60_000;
const seasons = [{ number: 1, aired_episodes: 1, episodes: [{ ids: { trakt: 9 }, season: 1, number: 1 }] }];

function api(response: () => Response) {
  const paths: string[] = [];
  return { paths, get: (path: string) => (paths.push(path), Promise.resolve(response())) };
}

describe('loadShowCatalog', () => {
  it('should read and save a show it has no catalog for', async () => {
    const store = showStore<ShowCatalog>('catalogs');
    const { get, paths } = api(() => Response.json(seasons));

    const catalog = await loadShowCatalog({ id: 7, store, get, now: () => 5 });

    expect(paths).toEqual(['/shows/7/seasons?extended=full,episodes']);
    expect(catalog.seasons.at(0)?.episodes.at(0)?.id).toBe(9);
    expect((await store.get([7])).get(7)?.fetchedAt).toBe(5);
  });

  it('should answer from a fresh catalog without a request', async () => {
    const store = showStore<ShowCatalog>('catalogs');
    await store.put([{ id: 7, seasons: [], fetchedAt: 0 }]);
    const { get, paths } = api(() => Response.json(seasons));

    await loadShowCatalog({ id: 7, store, get, now: () => HOUR });

    expect(paths).toEqual([]);
  });

  it('should fall back to a stale catalog when the read fails', async () => {
    const store = showStore<ShowCatalog>('catalogs');
    const stale = { id: 7, seasons: [], fetchedAt: 0 };
    await store.put([stale]);
    const { get } = api(() => new Response('', { status: 500 }));

    expect(await loadShowCatalog({ id: 7, store, get, now: () => 13 * HOUR })).toEqual(stale);
  });

  it('should reject when the read fails and nothing is cached', async () => {
    const { get } = api(() => new Response('', { status: 500 }));

    await expect(loadShowCatalog({ id: 7, store: showStore('catalogs'), get })).rejects.toThrow('500');
  });
});
