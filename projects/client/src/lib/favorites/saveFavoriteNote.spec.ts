import { describe, expect, it, vi } from 'vitest';
import { saveFavoriteNote } from './saveFavoriteNote.ts';

describe('saveFavoriteNote', () => {
  it('should update the list-item id and allow clearing notes', async () => {
    const notify = { success: vi.fn(), error: vi.fn() };
    const request = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    expect(await saveFavoriteNote({ id: 42, notes: '  ', request, notify })).toBe(true);
    expect(request).toHaveBeenCalledWith('/sync/favorites/42', { notes: '' });
    expect(notify.success).toHaveBeenCalledWith('Notes saved!');
  });
  it.each([403, 429, 500])('should keep the draft retryable on failure %s', async (status) => {
    const notify = { success: vi.fn(), error: vi.fn() };
    const request = () => Promise.resolve(Response.json({ message: 'Could not save' }, { status }));
    expect(await saveFavoriteNote({ id: 42, notes: 'Notes', request, notify })).toBe(false);
    expect(notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
});
