import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchRecentlyWatched } from './fetchRecentlyWatched.ts';
import { recentlyWatchedFixture } from './recentlyWatchedFixture.ts';

const HISTORY = 'https://apiz.trakt.tv/sync/history';
const seen: Request[] = [];
const server = setupServer();
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const fetch = (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

describe('fetchRecentlyWatched', () => {
  it("should ask for the token owner's last nine plays", async () => {
    server.use(http.get(HISTORY, ({ request }) => {
      seen.push(request);
      return HttpResponse.json(recentlyWatchedFixture.rows);
    }));

    const plays = await fetchRecentlyWatched({ fetch, token: 'abc', datePreferences });
    const url = new URL(seen.at(0)?.url ?? '');

    expect(url.searchParams.get('limit')).toBe('9');
    expect(url.searchParams.get('extended')).toBe('full,images');
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer abc');
    expect(plays.map(({ key }) => key)).toEqual(recentlyWatchedFixture.rows.map(({ id }) => id));
  });

  it('should reject a failed or malformed history, so the panel shows its own error', async () => {
    server.use(http.get(HISTORY, () => new HttpResponse(null, { status: 502 })));
    await expect(fetchRecentlyWatched({ fetch, token: 'abc', datePreferences })).rejects.toThrow('502');

    server.use(http.get(HISTORY, () => HttpResponse.json({ nope: true })));
    await expect(fetchRecentlyWatched({ fetch, token: 'abc', datePreferences })).rejects.toThrow('invalid');
  });
});
