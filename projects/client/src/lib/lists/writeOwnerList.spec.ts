import { describe, expect, it, vi } from 'vitest';
import { writeOwnerList } from './writeOwnerList.ts';
const notify = () => ({ error: vi.fn() });
describe('writeOwnerList', () => {
  it('should omit an untouched description and the two cut settings', async () => {
    const request = vi.fn(async () =>
      await Response.json({ sort_by: 'title', sort_how: 'desc', description: 'Keep me' })
    );
    expect(
      await writeOwnerList({
        kind: 'watchlist',
        change: { type: 'metadata', body: { sort_by: 'title', sort_how: 'desc' } },
        request,
        notify: notify(),
      }),
    ).toBe(true);
    expect(request.mock.calls.at(0)).toEqual(['/sync/watchlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"sort_by":"title","sort_how":"desc"}',
    }]);
  });
  it('should save blank notes as removal using the list item id', async () => {
    const request = vi.fn(async () => await new Response(null, { status: 204 }));
    expect(
      await writeOwnerList({
        kind: 'favorites',
        change: { type: 'notes', id: 123, notes: '  ' },
        request,
        notify: notify(),
      }),
    ).toBe(true);
    expect(request.mock.calls.at(0)).toEqual(['/sync/favorites/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{"notes":""}',
    }]);
  });
  it('should reject skipped ranks, incomplete writes, malformed responses and network failures', async () => {
    for (const result of [{ updated: 1, skipped_ids: [2] }, { updated: 1, skipped_ids: [] }, {}, null]) {
      const alerts = notify();
      const ok = await writeOwnerList({
        kind: 'watchlist',
        change: { type: 'order', rank: [1, 2] },
        request: async () => {
          if (result === null) return Promise.reject(new Error('offline'));
          return await Response.json(result);
        },
        notify: alerts,
      });
      expect(ok).toBe(false);
      expect(alerts.error).toHaveBeenCalledOnce();
    }
  });
  it('should accept only a complete reorder', async () => {
    expect(
      await writeOwnerList({
        kind: 'favorites',
        change: { type: 'order', rank: [2, 1] },
        request: async () => await Response.json({ updated: 2, skipped_ids: [] }),
        notify: notify(),
      }),
    ).toBe(true);
  });
  it('should group removals by media id and reject partial deletes', async () => {
    const request = vi.fn(async () =>
      await Response.json({ deleted: { movies: 1, shows: 0 }, not_found: { shows: [{}] } })
    );
    expect(
      await writeOwnerList({
        kind: 'watchlist',
        change: { type: 'remove', items: [{ type: 'movie', id: 10 }, { type: 'show', id: 20 }] },
        request,
        notify: notify(),
      }),
    ).toBe(false);
    expect(request.mock.calls.at(0)?.at(1)).toMatchObject({
      method: 'POST',
      body: '{"movies":[{"ids":{"trakt":10}}],"shows":[{"ids":{"trakt":20}}],"seasons":[],"episodes":[]}',
    });
  });
});
