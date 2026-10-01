import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadOfficialList } from './loadOfficialList.ts';

const root = 'https://apiz.trakt.tv';
const seen: { url: URL; auth: string | null }[] = [];
const record = (request: Request) =>
  seen.push({ url: new URL(request.url), auth: request.headers.get('authorization') });
const summary = {
  name: 'Collection',
  description: 'Our films.',
  privacy: 'public',
  type: 'official',
  display_numbers: true,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  item_count: 1,
  comment_count: 0,
  likes: 2,
  ids: { trakt: 44, slug: 'collection' },
  user: { username: 'trakt', ids: { slug: 'trakt' } },
};
const row = {
  type: 'movie',
  rank: 1,
  id: 101,
  listed_at: '2026-01-01',
  notes: 'Watch this.',
  movie: {
    title: 'Heat',
    ids: { trakt: 1, slug: 'heat-1995' },
    images: { fanart: ['media.trakt.tv/images/movies/1/fanarts/medium/f.jpg.webp'] },
  },
};
const server = setupServer(
  http.get(`${root}/lists/:id`, ({ request, params }) => {
    record(request);
    if (params.id === 'missing') return new HttpResponse(null, { status: 204 });
    return HttpResponse.json(summary);
  }),
  http.get(`${root}/lists/:id/items*`, ({ request }) => {
    record(request);
    const [, by = 'rank', how = 'asc'] = new URL(request.url).pathname.split('/items').at(1)?.split('/').slice(1) ?? [];
    return HttpResponse.json([row], {
      headers: {
        'X-Sort-By': by,
        'X-Sort-How': how,
        'X-Pagination-Page': '1',
        'X-Pagination-Page-Count': '1',
        'X-Pagination-Item-Count': '1',
      },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());
const load = (query = '', slug = 'collection', signedIn = false) =>
  loadOfficialList({
    fetch,
    locals: { token: 'stale-cookie' },
    params: { slug },
    url: new URL(`https://og.trakt.tv/lists/official/${slug}${query}`),
    parent: () =>
      Promise.resolve({
        user: signedIn ? { slug: 'kim', firstName: 'Kim', isVip: false, avatarUrl: '' } : null,
        datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
      }),
  });

describe('loadOfficialList', () => {
  it('should read the public summary, items and random cover without the cookie token', async () => {
    const result = await load();
    expect(result.kind).toBe('official');
    expect(result.list.href).toBe('/lists/official/collection');
    expect(result.cards.at(0)?.notes).toBe('Watch this.');
    expect(result.listCover).toBe('https://media.trakt.tv/images/movies/1/fanarts/full/f.jpg.webp');
    expect(result.collaborators).toEqual([]);
    expect(result.stats).toEqual({ count: 1, runtime: 90 });
    expect(seen).toHaveLength(3);
    expect(seen.every(({ auth }) => auth === null)).toBe(true);
  });

  it('should keep the random cover independent of pagination, genres and item types', async () => {
    const result = await load('?display=movie&genres=drama&page=2&sort=title,desc');
    expect(result.sort).toEqual({ by: 'title', how: 'desc' });
    const cover = seen.find(({ url }) => url.pathname.endsWith('/random/asc'))?.url;
    expect(cover?.pathname).toBe('/lists/44/items/all/random/asc');
    expect(cover?.searchParams.get('limit')).toBe('1');
    expect(cover?.searchParams.get('page')).toBe('1');
    expect(cover?.searchParams.has('genres')).toBe(false);
    expect(seen.find(({ url }) => url.pathname.endsWith('/title/desc'))?.url.searchParams.get('genres')).toBe('drama');
  });

  it('should apply viewer hide filters while keeping the official cover unfiltered', async () => {
    const result = await load('?hide=notes,noreleasedate', 'collection', true);
    expect(result.fadeHide.hide).toEqual(['notes', 'noreleasedate']);
    const viewer = seen.find(({ auth }) => auth !== null);
    expect(viewer?.url.searchParams.get('hide_notes')).toBe('true');
    expect(viewer?.url.searchParams.get('hide_noreleasedate')).toBe('true');
    const cover = seen.find(({ url }) => url.pathname.endsWith('/random/asc'));
    expect(cover?.url.searchParams.has('hide')).toBe(false);
  });

  it('should apply the VIP sort gate', async () => {
    const result = await load('?sort=imdb_rating,desc');
    expect(result.sort).toEqual({ by: 'rank', how: 'desc' });
  });

  it('should keep the public items when a viewer sort rejects a stale token', async () => {
    server.use(http.get(`${root}/lists/:id/items*`, ({ request }) => {
      record(request);
      if (request.headers.has('authorization')) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json([row]);
    }));
    const result = await load('?sort=my_rating,desc', 'collection', true);
    expect(result.cards.at(0)?.title).toBe('Heat');
    expect(result.stats).toEqual({ count: 1, runtime: 90 });
    expect(seen.filter(({ auth }) => auth !== null)).toHaveLength(1);
  });

  it('should read the items by Trakt id, since the items endpoints reject a slug', async () => {
    await load();
    const items = seen.filter(({ url }) => url.pathname.includes('/items'));
    expect(items).toHaveLength(2);
    expect(items.every(({ url }) => /^\/lists\/44\/items(\/|$)/.test(url.pathname))).toBe(true);
  });

  it('should 404 missing and non-official lists', async () => {
    await expect(load('', 'missing')).rejects.toMatchObject({ status: 404 });
    server.use(http.get(`${root}/lists/:id`, () => HttpResponse.json({ ...summary, type: 'personal' })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
  });

  it('should redirect an id to the canonical slug and preserve filters', async () => {
    await expect(load('?display=movie', '44')).rejects.toMatchObject({
      status: 301,
      location: '/lists/official/collection?display=movie',
    });
  });

  it('should distinguish item failures from an unavailable decorative cover', async () => {
    server.use(
      http.get(
        `${root}/lists/:id/items*`,
        ({ request }) =>
          new URL(request.url).pathname.endsWith('/random/asc')
            ? new HttpResponse(null, { status: 500 })
            : HttpResponse.json([row]),
      ),
    );
    expect((await load()).listCover).toBeUndefined();
    server.use(http.get(`${root}/lists/:id/items*`, () => new HttpResponse(null, { status: 500 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
