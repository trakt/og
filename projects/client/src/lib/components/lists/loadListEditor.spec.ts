import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadListEditor } from './loadListEditor.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const base = 'https://apiz.trakt.tv';
const list = {
  ids: { trakt: 12 },
  name: 'Club',
  description: null,
  privacy: 'friends',
  allow_comments: false,
  display_numbers: true,
  item_count: 0,
};
function fixture() {
  server.use(
    http.get(`${base}/users/me/followers`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('limit')).toBe('all');
      return HttpResponse.json([{
        user: {
          username: 'new',
          name: 'New follower',
          ids: { slug: 'new' },
          images: { avatar: { full: 'avatar.jpg' } },
        },
      }]);
    }),
    http.get(`${base}/users/me/lists`, () => HttpResponse.json([], { headers: { 'x-pagination-item-count': '5' } })),
    http.get(`${base}/users/me/lists/12`, () => HttpResponse.json(list)),
    http.get(
      `${base}/lists/12/collaborators`,
      () => HttpResponse.json([{ username: 'old', name: 'Existing friend', ids: { slug: 'old' } }]),
    ),
  );
}
describe('loadListEditor', () => {
  it('should retain existing collaborators absent from followers and default nullable fields', async () => {
    fixture();
    const result = await loadListEditor({ fetch, id: 12 });
    expect(result.count).toBe(5);
    expect(result.initial).toMatchObject({ description: '', sort_by: 'rank', sort_how: 'asc', collaborators: ['old'] });
    expect(result.candidates.map((user) => user.slug)).toEqual(['new', 'old']);
    expect(result.candidates.at(0)?.avatar).toBe('avatar.jpg');
  });
  it('should load the count and candidates without a summary for creation', async () => {
    fixture();
    expect((await loadListEditor({ fetch, id: null })).initial).toBeUndefined();
  });
  it('should reject a failed collaborator read rather than silently clearing collaborators', async () => {
    fixture();
    server.use(http.get(`${base}/lists/12/collaborators`, () => new HttpResponse(null, { status: 503 })));
    await expect(loadListEditor({ fetch, id: 12 })).rejects.toThrow('Could not load this list');
  });
});
