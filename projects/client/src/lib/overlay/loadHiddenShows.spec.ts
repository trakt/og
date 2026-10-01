import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { loadHiddenShows } from './loadHiddenShows.ts';
const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const get = (path: string) => rawApiFetch({ path });

describe('loadHiddenShows', () => {
  it('should retain dates from every page of API hidden rows', async () => {
    server.use(http.get(`${API}/users/hidden/dropped`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json([{ type: 'show', hidden_at: '2026-01-01T00:00:00Z', show: { ids: { trakt: page } } }], {
        headers: { 'X-Runtime': '0.01', 'X-Pagination-Page-Count': '2' },
      });
    }));
    expect(await loadHiddenShows(get, 'dropped')).toEqual(
      new Map([[1, '2026-01-01T00:00:00Z'], [2, '2026-01-01T00:00:00Z']]),
    );
  });
  it('should reject a malformed API response', async () => {
    server.use(
      http.get(
        `${API}/users/hidden/progress_watched_reset`,
        () => HttpResponse.json([{ type: 'show', show: { ids: { trakt: '1' } } }]),
      ),
    );
    await expect(loadHiddenShows(get, 'progress_watched_reset')).rejects.toThrow();
  });
});
