import { describe, expect, it, vi } from 'vitest';
import { saveList } from './saveList.ts';
import { ListWriteError } from './ListWriteError.ts';
const draft = {
  name: ' Friday ',
  description: 'Movies',
  privacy: 'friends',
  allow_comments: false,
  display_numbers: true,
  sort_by: 'title',
  sort_how: 'desc',
  collaborators: ['new-follower'],
};
const list = { ...draft, ids: { trakt: 12, slug: 'friday' }, item_count: 0 };
describe('saveList', () => {
  it('should save preferences and remove collaborators before adding replacements', async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json(list)).mockResolvedValueOnce(
      Response.json([{ username: 'old', ids: { slug: 'old-follower' } }]),
    ).mockResolvedValue(new Response(null, { status: 204 }));
    expect((await saveList({ draft, id: 12, request })).collaboratorError).toBe('');
    expect(request.mock.calls).toEqual([
      ['/users/me/lists/12', 'PUT', {
        name: 'Friday',
        description: 'Movies',
        privacy: 'friends',
        allow_comments: false,
        display_numbers: true,
        sort_by: 'title',
        sort_how: 'desc',
      }],
      ['/lists/12/collaborators', 'GET'],
      ['/lists/12/collaborators/old-follower', 'DELETE'],
      ['/lists/12/collaborators/new-follower', 'POST'],
    ]);
  });
  it('should retain the created id when a collaborator fails so retry cannot create a duplicate', async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json(list)).mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    const result = await saveList({ draft, request });
    expect(result.list.ids.trakt).toBe(12);
    expect(result.collaboratorError).toContain('Your list was saved');
  });
  it('should preserve list-limit and field-validation failures', async () => {
    await expect(
      saveList({
        draft,
        request: () => Promise.resolve(Response.json({ message: 'Too many lists' }, { status: 420 })),
      }),
    ).rejects.toMatchObject({ status: 420 });
    await expect(
      saveList({
        draft,
        request: () => Promise.resolve(Response.json({ errors: { name: ['Already taken'] } }, { status: 422 })),
      }),
    ).rejects.toBeInstanceOf(ListWriteError);
  });
});
