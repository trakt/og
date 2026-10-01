import type { HotReleaseResponse, WatchNowResponse } from '@trakt/api';

type Show = NonNullable<HotReleaseResponse['show']>;
type Movie = NonNullable<HotReleaseResponse['movie']>;
type Offers = WatchNowResponse[string];

const images = (kind: 'shows' | 'movies', folder: string, poster: string, fanart: string) => ({
  poster: [`media.trakt.tv/images/${kind}/${folder}/posters/medium/${poster}.jpg.webp`],
  fanart: [`media.trakt.tv/images/${kind}/${folder}/fanarts/medium/${fanart}.jpg.webp`],
  logo: [],
  clearart: [],
  banner: [],
  thumb: [],
});

// Public shows and a movie with their real artwork; the episodes, dates and offers are made up.
const shows = {
  boys: {
    title: 'The Boys',
    year: 2019,
    ids: { trakt: 139960, slug: 'the-boys-2019' },
    network: 'Prime Video',
    country: 'us',
    genres: ['action', 'fantasy'],
    images: images('shows', '000/139/960', 'c5b8a81eba', '50bab4ef44'),
  },
  severance: {
    title: 'Severance',
    year: 2022,
    ids: { trakt: 154997, slug: 'severance' },
    network: 'Apple TV',
    country: 'us',
    genres: ['science-fiction', 'mystery'],
    images: images('shows', '000/154/997', 'f60ddb06de', '9400ecb8e2'),
  },
  lastOfUs: {
    title: 'The Last of Us',
    year: 2023,
    ids: { trakt: 158947, slug: 'the-last-of-us' },
    network: 'HBO',
    country: 'us',
    genres: ['drama'],
    images: images('shows', '000/158/947', 'ddcfc6b5a2', '5cdf75e791'),
  },
  slowHorses: {
    title: 'Slow Horses',
    year: 2022,
    ids: { trakt: 155534, slug: 'slow-horses' },
    network: 'Apple TV',
    country: 'gb',
    genres: ['drama', 'crime'],
    images: images('shows', '000/155/534', '6b6d40b6de', '631e5c2683'),
  },
  scrubs: {
    title: 'Scrubs',
    year: 2026,
    ids: { trakt: 291441, slug: 'scrubs-2026' },
    network: 'ABC',
    country: 'us',
    genres: ['comedy'],
    images: images('shows', '000/291/441', 'a061090ff1', 'aa07382177'),
  },
} satisfies Record<string, Show>;

const dune: Movie = {
  title: 'Dune: Part Two',
  year: 2024,
  ids: { trakt: 537449, slug: 'dune-part-two-2024' },
  tagline: 'Long live the fighters.',
  images: images('movies', '000/537/449', '2acc44f507', 'b7e56e851f'),
};

type Airing = {
  show: Show;
  season: number;
  number: number;
  title: string;
  type?: 'season_premiere' | 'season_finale' | 'mid_season_finale';
  /** Days after `today`. */
  day: number;
  /** The UTC hour on that day. */
  hour: number;
};

const airings: readonly Airing[] = [
  {
    show: shows.boys,
    season: 5,
    number: 1,
    title: 'Fifteen Inches of Sheer Dynamite',
    type: 'season_premiere',
    day: 0,
    hour: 12,
  },
  { show: shows.boys, season: 5, number: 2, title: 'Every Man for Himself', day: 0, hour: 12 },
  { show: shows.severance, season: 3, number: 4, title: 'Woe’s Hollow', day: 0, hour: 14 },
  { show: shows.lastOfUs, season: 3, number: 1, title: 'Long, Long Time', type: 'season_premiere', day: 1, hour: 13 },
  { show: shows.slowHorses, season: 6, number: 6, title: 'Footprints', type: 'season_finale', day: 3, hour: 11 },
  { show: shows.scrubs, season: 2, number: 3, title: 'My Old Lady', day: 4, hour: 12 },
  { show: shows.severance, season: 3, number: 5, title: 'Trojan’s Horse', type: 'mid_season_finale', day: 6, hour: 14 },
  { show: shows.boys, season: 5, number: 3, title: 'Beware the Jabberwock, My Son', day: 6, hour: 12 },
  { show: shows.lastOfUs, season: 3, number: 2, title: 'Infected', day: 8, hour: 13 },
];

const addDays = (today: string, days: number) => {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const offers = (source: string, type: 'subscription' | 'cinema'): Offers => ({
  free: [],
  subscription: [],
  cable: [],
  purchase: [],
  cinema: [],
  [type]: [{ source, link: 'watchnow.trakt.tv/watchnow/0', uhd: false, currency: 'usd', prices: {} }],
});

/**
 * A made-up `/calendars/my/media` window around `today` (`YYYY-MM-DD`, midday UTC so every zone keeps its day): seven
 * days with something on, so only the first five show. Some items have Watch Now offers in the US: The Boys on Prime
 * Video, and Dune only in cinemas.
 */
export const scheduleFixture = {
  rows(today: string): HotReleaseResponse[] {
    const episodes = airings.map(({ show, season, number, title, type, day, hour }): HotReleaseResponse => {
      const at = `${addDays(today, day)}T${String(hour).padStart(2, '0')}:00:00.000Z`;
      return {
        first_aired: at,
        show,
        episode: {
          season,
          number,
          title,
          episode_type: type ?? 'standard',
          ids: { trakt: show.ids.trakt * 1000 + season * 100 + number },
        },
      };
    });

    return [...episodes, { released: addDays(today, 1), movie: dune }];
  },
  offers: new Map<string, Offers>([
    [`/shows/${shows.boys.ids.trakt}/seasons/5/episodes/1`, offers('amazon_prime_video', 'subscription')],
    [`/shows/${shows.boys.ids.trakt}/seasons/5/episodes/2`, offers('amazon_prime_video', 'subscription')],
    [`/movies/${dune.ids.trakt}`, offers('amc', 'cinema')],
  ]),
};
