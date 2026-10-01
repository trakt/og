import { describe, expect, it } from 'vitest';
import { loadHiddenProgress } from './loadHiddenProgress.ts';

const show = (id: number) => ({ type: 'show', hidden_at: '2026-01-01T00:00:00.000Z', show: { ids: { trakt: id } } });
const season = (id: number, number: number) => ({ type: 'season', show: { ids: { trakt: id } }, season: { number } });

describe('loadHiddenProgress', () => {
  it('should read every page and split shows from seasons', async () => {
    const pages: Record<string, unknown[]> = { 1: [show(1), season(2, 1)], 2: [season(2, 3), show(4)] };
    const paths: string[] = [];
    const get = (path: string) => {
      paths.push(path);
      const page = new URL(path, 'https://apiz').searchParams.get('page') ?? '1';
      return Promise.resolve(Response.json(pages[page], { headers: { 'X-Pagination-Page-Count': '2' } }));
    };

    const hidden = await loadHiddenProgress(get, 'progress_watched');

    expect(paths).toEqual([
      '/users/hidden/progress_watched?limit=250&page=1',
      '/users/hidden/progress_watched?limit=250&page=2',
    ]);
    expect(hidden.shows).toEqual(new Set([1, 4]));
    expect(hidden.seasons).toEqual(new Map([[2, new Set([1, 3])]]));
  });

  it('should throw when a page fails', async () => {
    const get = () => Promise.resolve(new Response('', { status: 500 }));
    await expect(loadHiddenProgress(get, 'progress_collected')).rejects.toThrow('500');
  });
});
