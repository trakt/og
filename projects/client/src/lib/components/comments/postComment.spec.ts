import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commentError, postComment } from './postComment.ts';

const created = {
  id: 9,
  parent_id: 0,
  created_at: '2026-09-30T10:00:00.000Z',
  updated_at: '2026-09-30T10:00:00.000Z',
  comment: 'This is five words long',
  spoiler: true,
  review: false,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 0, completed_count: 0 },
  user: { username: 'sean', private: false, deleted: false, vip: false, ids: { slug: 'sean', trakt: 1 } },
};
const posted = (): Response => HttpResponse.json(created, { status: 201 });
let reply = posted;
const seen: unknown[] = [];
const server = setupServer(
  http.post('https://apiz.trakt.tv/comments', async ({ request }) => {
    seen.push(await request.json());
    return reply();
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
  reply = posted;
});
afterAll(() => server.close());

const episode = { type: 'episode', id: 73482 } as const;

describe('postComment', () => {
  it('should post the text and spoiler flag on the item, without sharing', async () => {
    const result = await postComment({ fetch, item: episode, comment: created.comment, spoiler: true });
    expect(seen).toEqual([{ episode: { ids: { trakt: 73482 } }, comment: created.comment, spoiler: true }]);
    expect(result).toMatchObject({ ok: true, comment: { id: 9, spoiler: true } });
  });

  it('should still count an off-contract 201 as posted', async () => {
    reply = () => HttpResponse.json({ id: 9 }, { status: 201 });
    expect(await postComment({ fetch, item: episode, comment: 'x', spoiler: false })).toEqual({
      ok: true,
      comment: null,
    });
  });

  it("should toast the server's message on a 422", async () => {
    reply = () => HttpResponse.json({ errors: { comment: ['must be at least 5 words'] } }, { status: 422 });
    expect(await postComment({ fetch, item: episode, comment: 'Too short', spoiler: false }))
      .toEqual({ ok: false, message: 'Comment must be at least 5 words.' });
  });
});

describe('commentError', () => {
  it("should use OG's rate limit and fallback messages", () => {
    expect(commentError(429, null)).toMatch(/^ERROR 429: Whoa there/);
    expect(commentError(500, '<html>')).toMatch(/^There was an unknown error/);
    expect(commentError(422, { errors: {} })).toMatch(/^There was an unknown error/);
  });

  it("should end a 404's message with one full stop", () => {
    expect(commentError(404, { message: "This item doesn't allow comments." })).toBe(
      "This item doesn't allow comments.",
    );
    expect(commentError(404, { message: 'Not found' })).toBe('Not found.');
  });

  it('should humanize the field name', () => {
    expect(commentError(422, { errors: { user_id: ['is banned'] } })).toBe('User id is banned.');
  });
});
