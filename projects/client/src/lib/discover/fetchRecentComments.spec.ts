import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchRecentComments } from './fetchRecentComments.ts';

const API = 'https://apiz.trakt.tv';
const comment = {
  id: 7,
  parent_id: 0,
  created_at: '2026-09-30T12:00:00.000Z',
  updated_at: '2026-09-30T12:00:00.000Z',
  comment: 'Great.',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 0, completed_count: 0 },
  user: { username: 'sean', ids: { slug: 'sean' } },
};
const show = { ids: { trakt: 1, slug: 'the-boys-2019' }, title: 'The Boys', year: 2019 };
const requests: URL[] = [];

const server = setupServer(
  http.get(`${API}/comments/recent/:commentType/:type`, ({ request, params }) => {
    requests.push(new URL(request.url));
    if (params.type === 'seasons') return new HttpResponse(null, { status: 500 });
    return HttpResponse.json([{ type: 'show', comment, show }, {
      type: 'episode',
      comment: { ...comment, id: 8 },
      show,
    }]);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

describe('fetchRecentComments', () => {
  it("should ask for OG's 15 newest comments of the picked types, with images", async () => {
    await fetchRecentComments({ commentType: 'reviews', mediaType: 'all' });

    expect(requests.at(0)?.pathname).toBe('/comments/recent/reviews/all');
    expect(Object.fromEntries(requests.at(0)?.searchParams ?? [])).toEqual({ limit: '15', extended: 'images' });
  });

  it('should map the rows it can show and skip the rest', async () => {
    const comments = await fetchRecentComments({ commentType: 'all', mediaType: 'all' });

    expect(comments.map(({ comment: { id }, title }) => [id, title])).toEqual([[7, 'The Boys']]);
  });

  it('should reject when the API fails', async () => {
    await expect(fetchRecentComments({ commentType: 'all', mediaType: 'seasons' })).rejects.toThrow('500');
  });
});
