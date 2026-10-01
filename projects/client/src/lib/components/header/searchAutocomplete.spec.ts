import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { searchAutocomplete } from './searchAutocomplete.ts';
import { searchTypes } from './searchTypes.ts';

const show = (trakt: number) => ({
  type: 'show',
  score: 1,
  show: { title: `Show ${trakt}`, year: 2008, ids: { trakt, slug: `show-${trakt}` }, genres: [], images: null },
});
const hits = (count: number) => Array.from({ length: count }, (_, index) => show(index + 1));
const user = (trakt: number, flags: { private?: boolean; deleted?: boolean } = {}) => ({
  type: 'user',
  score: 0,
  user: {
    username: `sean ${trakt}`,
    private: flags.private ?? false,
    deleted: flags.deleted ?? false,
    name: `Sean ${trakt}`,
    ids: { slug: `sean-${trakt}`, trakt },
    images: { avatar: { full: `https://media.trakt.tv/avatars/${trakt}.jpg` } },
  },
});

const seen: URL[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/search/user', ({ request }) => {
    seen.push(new URL(request.url));
    return HttpResponse.json([
      user(1),
      user(2, { deleted: true }),
      user(3, { private: true }),
      user(4),
      user(5),
      user(6),
    ]);
  }),
  http.get('https://apiz.trakt.tv/search/:type', ({ request }) => {
    const url = new URL(request.url);
    seen.push(url);
    const results = url.searchParams.get('query') === 'many' ? hits(50) : hits(4);
    return HttpResponse.json(results, { headers: { 'X-Pagination-Item-Count': String(results.length) } });
  }),
  http.get('https://apiz.trakt.tv/search/:idType/:id', ({ request }) => {
    seen.push(new URL(request.url));
    return HttpResponse.json(hits(2));
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const byLabel = (label: string) => {
  const type = searchTypes.find((option) => option.label === label);
  if (!type) throw new Error(label);
  return type;
};

describe('searchAutocomplete', () => {
  it('should show 3 rows and count every result for a text type', async () => {
    const result = await searchAutocomplete({ type: byLabel('Shows & Movies'), query: 'bre' });

    expect(seen.at(0)?.pathname).toBe('/search/movie,show');
    expect(seen.at(0)?.searchParams.get('query')).toBe('bre');
    expect(result.rows.map((row) => row.title)).toEqual(['Show 1', 'Show 2', 'Show 3']);
    expect(result.count).toBe('4');
  });

  it('should say 50+ when the count reaches the limit', async () => {
    const result = await searchAutocomplete({ type: byLabel('Shows'), query: 'many' });

    expect(seen.at(0)?.pathname).toBe('/search/show');
    expect(result.count).toBe('50+');
  });

  it('should look up an ID type with no View all count', async () => {
    const result = await searchAutocomplete({ type: byLabel('IMDB ID'), query: 'tt0903747' });

    expect(seen.at(0)?.pathname).toBe('/search/imdb/tt0903747');
    expect(result.rows).toHaveLength(2);
    expect(result.count).toBeNull();
  });

  it('should show 3 public, active users with no View all count', async () => {
    const result = await searchAutocomplete({ type: byLabel('Users'), query: 'se' });

    expect(seen.at(0)?.pathname).toBe('/search/user');
    expect(seen.at(0)?.searchParams.get('query')).toBe('se');
    expect(seen.at(0)?.searchParams.get('extended')).toBe('full');
    expect(result.rows.map((row) => row.title)).toEqual(['Sean 1', 'Sean 4', 'Sean 5']);
    expect(result.count).toBeNull();
  });

  it('should ask nothing for a one-letter Users query', async () => {
    const result = await searchAutocomplete({ type: byLabel('Users'), query: 's' });

    expect(seen).toHaveLength(0);
    expect(result).toEqual({ rows: [], count: null });
  });

  it('should show no users when the API fails', async () => {
    server.use(http.get('https://apiz.trakt.tv/search/user', () => HttpResponse.json(null, { status: 504 })));

    const result = await searchAutocomplete({ type: byLabel('Users'), query: 'sean' });

    expect(result).toEqual({ rows: [], count: null });
  });
});
