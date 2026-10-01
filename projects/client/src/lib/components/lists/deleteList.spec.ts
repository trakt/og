import { describe, expect, it, vi } from 'vitest';
import { deleteList } from './deleteList.ts';
const catalog = [{ id: 12, name: 'Delete', count: 1, display_order: 0, type: 'standard', owner_id: 1 }, {
  id: 13,
  name: 'Keep',
  count: 1,
  display_order: 1,
  type: 'collaborative',
  owner_id: 2,
}];
describe('deleteList', () => {
  it('should keep membership from remaining collaborative lists and roll back a failed delete', async () => {
    const rollback = vi.fn();
    const restore = vi.fn();
    const patch = vi.fn((_name, update) => {
      expect(update({}).movie.has(99)).toBe(true);
      return rollback;
    });
    const request = vi.fn((path, method) => {
      if (path === '/v3/users/me/lists') return Promise.resolve(Response.json(catalog));
      if (method === 'DELETE') return Promise.resolve(new Response(null, { status: 500 }));
      expect(path).toBe('/lists/13/items?limit=250&page=1');
      return Promise.resolve(Response.json([{ type: 'movie', movie: { ids: { trakt: 99 } } }]));
    });
    const notify = { success: vi.fn(), error: vi.fn() };
    expect(await deleteList({ id: 12, request, overlay: { patch }, remove: () => restore, notify })).toBe(false);
    expect(rollback).toHaveBeenCalledOnce();
    expect(restore).toHaveBeenCalledOnce();
    expect(notify.error).toHaveBeenCalledOnce();
  });
  it('should allow deletion when auxiliary membership is unavailable', async () => {
    const patch = vi.fn();
    const restore = vi.fn();
    const notify = { success: vi.fn(), error: vi.fn() };
    const request = vi.fn((_path, method) =>
      Promise.resolve(new Response(null, { status: method === 'DELETE' ? 204 : 503 }))
    );
    expect(await deleteList({ id: 12, request, overlay: { patch }, remove: () => restore, notify })).toBe(true);
    expect(patch).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });
});
