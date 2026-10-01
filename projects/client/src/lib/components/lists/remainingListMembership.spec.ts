import { describe, expect, it } from 'vitest';
import { remainingListMembership } from './remainingListMembership.ts';
describe('remainingListMembership', () => {
  it('should read every remaining page and keep duplicate membership only once', async () => {
    const paths: string[] = [];
    const result = await remainingListMembership({
      exclude: 1,
      get: (path) => {
        paths.push(path);
        if (path === '/v3/users/me/lists') {
          return Promise.resolve(
            Response.json(
              [1, 2].map((id) => ({ id, name: 'Club', count: 1, display_order: 0, type: 'standard', owner_id: 1 })),
            ),
          );
        }
        const page = new URL(path, 'http://fixture').searchParams.get('page');
        return Promise.resolve(Response.json(
          page === '1'
            ? [{ type: 'movie', movie: { ids: { trakt: 9 } } }]
            : [{ type: 'movie', movie: { ids: { trakt: 9 } } }, { type: 'person', person: { ids: { trakt: 8 } } }],
          { headers: { 'x-pagination-page-count': '2' } },
        ));
      },
    });
    expect(paths).toEqual(['/v3/users/me/lists', '/lists/2/items?limit=250&page=1', '/lists/2/items?limit=250&page=2']);
    expect([...result.movie]).toEqual([9]);
    expect([...result.person]).toEqual([8]);
  });
  it('should reject malformed raw membership instead of inventing poster state', async () => {
    await expect(remainingListMembership({ exclude: 1, get: () => Promise.resolve(Response.json({ lists: [] })) }))
      .rejects.toThrow();
  });
});
