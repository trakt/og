import type { RatingsResponse } from '@trakt/api';
import { readableStat } from '../../utils/readableStat.ts';
import type { ExternalRating } from './ExternalRating.ts';

/** The JustWatch 30-day rank from `/watchnow/:country?extended=streaming_ranks`. */
export interface StreamingRank {
  readonly rank?: number | null;
  readonly delta?: number | null;
  readonly link?: string | null;
}

interface ExternalRatingsParams {
  ratings: RatingsResponse | null;
  rank?: StreamingRank | null;
  /** The watch-now country's name, shown under the rank. */
  countryName?: string;
}

type RottenTomatoes = NonNullable<RatingsResponse['rotten_tomatoes']>;

function tomatometerLogo({ rating, state }: RottenTomatoes) {
  if (state === 'certified') return 'certified';
  if ((rating ?? 0) >= 60 || state === 'fresh') return 'fresh';
  if (state === 'rotten') return 'rotten';
  return 'fresh';
}

function audienceLogo({ user_state }: RottenTomatoes) {
  if (user_state === 'certified' || user_state === 'spilled') return user_state;
  return 'upright';
}

function metascoreBand(score: number) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/**
 * OG's `_ratings_stats` "other sites" group, in OG's order. Each shows only with a score above zero and a link.
 * The API has no Rotten Tomatoes audience counts, so the audience line always says "Audience".
 */
export function toExternalRatings({ ratings, rank, countryName = '' }: ExternalRatingsParams): ExternalRating[] {
  const { imdb, tmdb, rotten_tomatoes: rt, metascore } = ratings ?? {};
  const tomatometer = rt ? tomatometerLogo(rt) : 'fresh';

  const entries: (ExternalRating | false)[] = [
    (imdb?.rating ?? 0) > 0 && !!imdb?.link && {
      logo: 'imdb',
      title: 'IMDb',
      href: `${imdb.link}/ratings`,
      rating: (imdb.rating ?? 0).toFixed(1),
      votes: readableStat(imdb.votes),
    },
    (tmdb?.rating ?? 0) > 0 && !!tmdb?.link && {
      logo: 'tmdb',
      title: 'TMDB',
      href: tmdb.link,
      rating: `${Math.trunc(((tmdb.rating ?? 0) / 10) * 100)}%`,
      votes: readableStat(tmdb.votes),
    },
    (rt?.rating ?? 0) > 0 && !!rt?.link && {
      logo: `tomatometer-${tomatometer}`,
      title: 'Rotten Tomatoes\nTomatometer',
      href: rt.link,
      rating: `${rt.rating}%`,
      votes: capitalize(tomatometer),
    },
    (rt?.user_rating ?? 0) > 0 && !!rt?.link && {
      logo: `audience-${audienceLogo(rt)}`,
      title: 'Rotten Tomatoes\nAudience Score',
      href: rt.link,
      rating: `${rt.user_rating}%`,
      votes: 'Audience',
    },
    (metascore?.rating ?? 0) > 0 && !!metascore?.link && {
      logo: 'metacritic',
      title: 'Metacritic',
      href: metascore.link,
      rating: String(metascore.rating),
      metascore: metascoreBand(metascore.rating ?? 0),
    },
    !!rank?.rank && !!rank.link && {
      logo: 'justwatch',
      title: 'Justwatch\n30 Day Streaming Rank',
      href: rank.link,
      rating: String(rank.rank),
      votes: countryName,
      delta: typeof rank.delta === 'number' ? `${rank.delta < 0 ? '' : '+'}${rank.delta}` : undefined,
    },
  ];

  return entries.filter((entry) => entry !== false);
}
