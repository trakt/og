import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchWatchlist } from './fetchWatchlist.ts';
import { watchlistFixture } from './watchlistFixture.ts';

const WATCHLIST = 'https://apiz.trakt.tv/users/me/watchlist';
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

const answer = (headers: Record<string, string>, status = 200) =>
  http.get(WATCHLIST, ({ request }) => {
    seen.push(request);
    return status === 200 ? HttpResponse.json(watchlistFixture.rows, { headers }) : new HttpResponse(null, { status });
  });

describe('fetchWatchlist', () => {
  it("should ask for 18 items in the watchlist's own sort, with the token", async () => {
    server.use(answer({ 'x-sort-by': 'added', 'x-sort-how': 'desc', 'x-pagination-item-count': '1234' }));

    const list = await fetchWatchlist({ fetch, token: 'abc', datePreferences });
    const url = new URL(seen.at(0)?.url ?? '');

    expect(url.pathname).toBe('/users/me/watchlist');
    expect(url.searchParams.get('limit')).toBe('18');
    expect(url.searchParams.get('extended')).toBe('full,images');
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer abc');
    expect(list).toMatchObject({ total: 1234, sortName: 'Added Date', sortHow: 'desc' });
    expect(list.cards).toHaveLength(watchlistFixture.rows.length);
  });

  it('should give each card the line for the sort', async () => {
    server.use(answer({ 'x-sort-by': 'added', 'x-sort-how': 'desc' }));

    const { cards } = await fetchWatchlist({ fetch, token: 'abc', datePreferences });

    expect(cards.at(0)?.lines.at(0)).toMatchObject({ text: 'Sep 28, 2026 8:15 PM' });
    // An episode puts its show first.
    expect(cards.at(3)?.lines.map((line) => 'text' in line && line.text)).toEqual([
      'Breaking Bad',
      'Sep 25, 2026 8:15 PM',
    ]);
  });

  it('should fall back to Rank without sort headers, and count the cards without a total', async () => {
    server.use(answer({}));

    const list = await fetchWatchlist({ fetch, token: 'abc', datePreferences });

    expect(list).toMatchObject({ total: watchlistFixture.rows.length, sortName: 'Rank', sortHow: 'asc' });
  });

  it('should reject when the watchlist fails, so the panel shows its own error', async () => {
    server.use(answer({}, 500));

    await expect(fetchWatchlist({ fetch, token: 'abc', datePreferences })).rejects.toThrow('500');
  });
});
