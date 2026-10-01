import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api } from '../../api/api.ts';
import { commentsClient } from './commentsClient.ts';

const API = 'https://apiz.trakt.tv';
const pages = (page: number, total: number) => ({
  'X-Pagination-Page': String(page),
  'X-Pagination-Page-Count': String(total),
});

const server = setupServer(
  http.get(`${API}/comments/1/replies`, ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page'));
    return HttpResponse.json([{ id: 100 + page }], { headers: pages(page, 2) });
  }),
  http.get(`${API}/comments/2/replies`, () => new HttpResponse(null, { status: 404 })),
  http.get(
    `${API}/comments/1/reactions/summary`,
    () => HttpResponse.json({ reaction_count: 3, user_count: 3, distribution: { like: 3 } }),
  ),
  http.get(`${API}/comments/2/reactions/summary`, () => new HttpResponse(null, { status: 500 })),
  http.post(`${API}/comments/1/replies`, async ({ request }) => {
    sent.push(await request.json());
    return HttpResponse.json(saved, { status: 201 });
  }),
  http.put(`${API}/comments/9`, async ({ request }) => {
    sent.push(await request.json());
    return HttpResponse.json({ ...saved, id: 9 });
  }),
  http.put(
    `${API}/comments/8`,
    () => HttpResponse.json({ errors: { comment: ['must be at least 5 words'] } }, { status: 422 }),
  ),
  http.delete(`${API}/comments/9`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${API}/users/hidden/comments`, async ({ request }) => {
    const body = await request.json();
    sent.push(body);
    const found = JSON.stringify(body).includes('"slug":"sean"');
    return HttpResponse.json({ added: { movies: 0, shows: 0, seasons: 0, users: found ? 1 : 0 }, not_found: {} }, {
      status: 201,
    });
  }),
  http.delete(`${API}/comments/8`, () => new HttpResponse(null, { status: 409 })),
);
const sent: unknown[] = [];
const saved = {
  id: 10,
  parent_id: 1,
  created_at: '2026-09-30T10:00:00.000Z',
  updated_at: '2026-09-30T10:00:00.000Z',
  comment: '@sean  agreed with every word',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 0, completed_count: 0 },
  user: { username: 'og', private: false, deleted: false, vip: false, ids: { slug: 'og', trakt: 2 } },
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  sent.length = 0;
});
afterAll(() => server.close());

describe('commentsClient', () => {
  // Built per test: api() captures fetch, and msw only patches it once the server listens.
  const client = () => commentsClient(api());

  it('should read every page of replies', async () => {
    expect((await client().replies(1)).map(({ id }) => id)).toEqual([101, 102]);
  });

  it('should reject when the replies fail', async () => {
    await expect(client().replies(2)).rejects.toThrow('404');
  });

  it('should return the reaction summary, or nothing when it fails', async () => {
    expect(await client().reactionSummary(1)).toEqual({ reaction_count: 3, user_count: 3, distribution: { like: 3 } });
    expect(await client().reactionSummary(2)).toBeUndefined();
  });

  it('should post a reply without a spoiler flag', async () => {
    const result = await client().reply(1, saved.comment);
    expect(sent).toEqual([{ comment: saved.comment, spoiler: false }]);
    expect(result).toMatchObject({ ok: true, comment: { id: 10, parent_id: 1 } });
  });

  it('should save an edit, or return the server message', async () => {
    const body = { comment: 'now with a spoiler flag on', spoiler: true };
    expect(await client().edit(9, body)).toMatchObject({ ok: true, comment: { id: 9 } });
    expect(sent).toEqual([body]);
    expect(await client().edit(8, body)).toEqual({ ok: false, message: 'Comment must be at least 5 words.' });
  });

  it('should block a member by slug, and fail when nobody was hidden', async () => {
    expect(await client().block('sean')).toEqual({ ok: true });
    expect(sent).toEqual([{ users: [{ ids: { slug: 'sean' } }] }]);
    expect(await client().block('ghost')).toMatchObject({ ok: false });
  });

  it('should delete, and fail on a conflict', async () => {
    expect(await client().remove(9)).toEqual({ ok: true, comment: null });
    expect(await client().remove(8)).toMatchObject({ ok: false, message: expect.stringMatching(/unknown error/) });
  });
});
