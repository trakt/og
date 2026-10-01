import { describe, expect, it, vi } from 'vitest';
import { createOverlay } from '../overlay/createOverlay.svelte.ts';
import { removeOwnerItems } from './removeOwnerItems.ts';
import { toListItemCard } from './toListItemCard.ts';
const item = toListItemCard({
  type: 'movie',
  id: 100,
  rank: 1,
  listed_at: '2026-01-01',
  movie: { title: 'Heat', ids: { trakt: 10, slug: 'heat' } },
}, { sortBy: 'rank', datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } });
const storage = {
  load: () => Promise.resolve([]),
  save: () => Promise.resolve(),
  clearExcept: () => Promise.resolve(),
};
const cache = () => createOverlay({ get: () => Promise.resolve(new Response(null, { status: 401 })), storage });
describe('removeOwnerItems', () => {
  it('should remove only selected movie membership and its favorite date', async () => {
    const overlay = cache();
    overlay.patch(
      'favorites',
      () => ({
        movie: new Set([10, 11]),
        show: new Set([10]),
        dates: { movie: new Map([[10, 'a'], [11, 'b']]), show: new Map([[10, 'c']]) },
      }),
      { movie: new Set(), show: new Set() },
    );
    const ok = await removeOwnerItems({
      kind: 'favorites',
      items: [item],
      overlay,
      notify: { error: vi.fn() },
      request: () => {
        expect(overlay.state('movie', 10).favorited).toBe(false);
        return Promise.resolve(Response.json({ deleted: { movies: 1, shows: 0 }, not_found: {} }));
      },
    });
    expect(ok).toBe(true);
    expect(overlay.state('movie', 11)).toMatchObject({ favorited: true, favoritedAt: 'b' });
    expect(overlay.state('show', 10)).toMatchObject({ favorited: true, favoritedAt: 'c' });
  });
  it('should restore an unknown watchlist after a failed removal', async () => {
    const overlay = cache();
    const notify = { error: vi.fn() };
    expect(
      await removeOwnerItems({
        kind: 'watchlist',
        items: [item],
        overlay,
        notify,
        request: () => Promise.resolve(new Response(null, { status: 500 })),
      }),
    ).toBe(false);
    expect(overlay.state('movie', 10).watchlisted).toBeUndefined();
    expect(notify.error).toHaveBeenCalledOnce();
  });
});
