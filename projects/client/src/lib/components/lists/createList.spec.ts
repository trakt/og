import { describe, expect, it } from 'vitest';
import { createList } from './createList.ts';
const draft = {
  name: '  Friday movies  ',
  description: 'Friends',
  privacy: 'link',
  allow_comments: false,
  display_numbers: true,
  sort_by: 'title',
  sort_how: 'desc',
};
describe('createList', () => {
  it('should send all modal preferences and trim the name', async () => {
    const created = await createList({
      draft,
      request: (path, body) => {
        expect(path).toBe('/users/me/lists');
        expect(body).toEqual({ ...draft, name: 'Friday movies' });
        return Promise.resolve(
          Response.json({ name: 'Friday movies', ids: { trakt: 12 }, privacy: 'link', item_count: 0 }),
        );
      },
    });
    expect(created.ids.trakt).toBe(12);
  });
  it('should preserve a list-limit status and reject malformed bodies', async () => {
    await expect(createList({ draft, request: () => Promise.resolve(new Response(null, { status: 420 })) })).rejects
      .toThrow('420');
    await expect(createList({ draft, request: () => Promise.resolve(Response.json({ id: 1 })) })).rejects.toThrow();
  });
});
