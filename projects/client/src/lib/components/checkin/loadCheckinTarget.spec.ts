import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { loadCheckinTarget } from './loadCheckinTarget.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const fetch = (path: string) => rawApiFetch({ path });
const images = (kind: string) => [`media.trakt.tv/images/${kind}/medium/a.jpg.webp`];

describe('loadCheckinTarget', () => {
  it('should build a movie target with its full title and images', async () => {
    server.use(http.get(`${API}/search/trakt/432`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('type')).toBe('movie');
      return HttpResponse.json([{
        movie: { title: 'Fight Club', year: 1999, images: { fanart: images('fanarts'), logo: images('logos') } },
      }]);
    }));

    expect(await loadCheckinTarget({ type: 'movie', id: 432, fetch })).toEqual({
      type: 'movie',
      id: 432,
      fullTitle: 'Fight Club (1999)',
      topTitle: 'Fight Club',
      logo: 'https://media.trakt.tv/images/logos/medium/a.jpg.webp',
      fanart: 'https://media.trakt.tv/images/fanarts/full/a.jpg.webp',
    });
  });

  it('should build an episode target from its show', async () => {
    server.use(http.get(`${API}/search/trakt/73482`, () =>
      HttpResponse.json([{
        show: { title: 'Breaking Bad', year: 2008, images: { fanart: images('fanarts') } },
        episode: {
          season: 1,
          number: 1,
          title: 'Pilot',
          first_aired: '2008-01-21T02:00:00.000Z',
          images: { screenshot: images('screenshots') },
        },
      }])));

    expect(await loadCheckinTarget({ type: 'episode', id: 73482, fetch })).toEqual({
      type: 'episode',
      id: 73482,
      fullTitle: 'Breaking Bad 1x01 "Pilot"',
      topTitle: 'Breaking Bad',
      logo: undefined,
      fanart: 'https://media.trakt.tv/images/fanarts/full/a.jpg.webp',
      episode: {
        number: '1x01',
        title: 'Pilot',
        firstAired: '2008-01-21T02:00:00.000Z',
        screenshot: 'https://media.trakt.tv/images/screenshots/full/a.jpg.webp',
      },
    });
  });

  it('should give up when the item is missing', async () => {
    server.use(http.get(`${API}/search/trakt/1`, () => HttpResponse.json([])));

    expect(await loadCheckinTarget({ type: 'movie', id: 1, fetch })).toBeNull();
  });
});
