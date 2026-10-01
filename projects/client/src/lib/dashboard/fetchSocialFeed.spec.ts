import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchSocialFeed } from './fetchSocialFeed.ts';
import { socialFeedFixture } from './socialFeedFixture.ts';

const FEED = 'https://apiz.trakt.tv/v3/users/me/following/activities';
const now = new Date('2026-09-30T12:00:30.500Z');
const seen: URL[] = [];
const server = setupServer();
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const fetch = (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args);
const feed = (following: number | null = 3) =>
  fetchSocialFeed({ fetch, token: 'abc', following: Promise.resolve(following), now, datePreferences });

// Answers each window with the fixture rows that fall inside it, like the worker.
const byWindow = (rows = socialFeedFixture.rows(now)) =>
  http.get(FEED, ({ request }) => {
    const url = new URL(request.url);
    seen.push(url);
    const start = Date.parse(url.searchParams.get('start_at') ?? '');
    const end = Date.parse(url.searchParams.get('end_at') ?? '');
    return HttpResponse.json(rows.filter(({ activity_at }) => {
      const at = Date.parse(activity_at);
      return at >= start && at <= end;
    }));
  });

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

describe('fetchSocialFeed', () => {
  it('should ask for watches a day at a time, back through the week', async () => {
    server.use(byWindow());

    const plays = await feed();
    const first = seen.at(0);

    expect(first?.searchParams.get('action')).toBe('watch');
    expect(first?.searchParams.get('limit')).toBe('12');
    expect(first?.searchParams.get('extended')).toBe('full,images');
    expect(first?.searchParams.get('end_at')).toBe('2026-09-30T12:00:00.000Z');
    expect(first?.searchParams.get('start_at')).toBe('2026-09-29T12:00:00.000Z');
    expect(seen.at(6)?.searchParams.get('start_at')).toBe('2026-09-23T12:00:00.000Z');
    expect(seen).toHaveLength(7);
    expect(plays.map(({ key }) => key)).toEqual([7001, 7002, 7003, 7004, 7005, 7006, 7007]);
  });

  it('should stop once 12 plays are in, and drop a play repeated on a window boundary', async () => {
    const [first] = socialFeedFixture.rows(now);
    const many = Array.from({ length: 13 }, (_, i) => ({ ...first, id: i + 1 }));
    server.use(http.get(FEED, ({ request }) => {
      seen.push(new URL(request.url));
      return HttpResponse.json(seen.length === 1 ? many.slice(0, 8) : many.slice(7));
    }));

    const plays = await feed();

    expect(seen).toHaveLength(2);
    expect(plays.map(({ key }) => key)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('should not ask when the viewer follows nobody, since the worker would send the team instead', async () => {
    server.use(byWindow());

    expect(await feed(0)).toEqual([]);
    expect(seen).toHaveLength(0);
  });

  it("should still ask when the following count didn't load", async () => {
    server.use(byWindow());

    expect(await feed(null)).toHaveLength(7);
  });

  it('should skip a row it cannot show', async () => {
    const [first] = socialFeedFixture.rows(now);
    server.use(http.get(FEED, () => HttpResponse.json([first, { id: 2, action: 'watch', type: 'movie' }])));

    expect((await feed()).map(({ key }) => key)).toEqual([first?.id]);
  });

  it('should reject a failed or malformed first day, so the panel shows its own error', async () => {
    server.use(http.get(FEED, () => new HttpResponse(null, { status: 403 })));
    await expect(feed()).rejects.toThrow('403');

    server.use(http.get(FEED, () => HttpResponse.json({ nope: true })));
    await expect(feed()).rejects.toThrow('invalid');
  });

  it('should keep the plays it has when a later day fails', async () => {
    const [first] = socialFeedFixture.rows(now);
    server.use(http.get(FEED, ({ request }) => {
      seen.push(new URL(request.url));
      return seen.length === 1 ? HttpResponse.json([first]) : new HttpResponse(null, { status: 502 });
    }));

    expect((await feed()).map(({ key }) => key)).toEqual([first?.id]);
    expect(seen).toHaveLength(2);
  });
});
