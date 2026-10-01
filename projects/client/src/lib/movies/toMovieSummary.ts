import type {
  ListedMovieResponse,
  ListResponse,
  MovieResponse,
  MovieStatsResponse,
  PeopleResponse,
  RatingsResponse,
  StudioResponse,
} from '@trakt/api';
import type { CastMember } from '../components/summary/CastMember.ts';
import { countryName, languageName, titleize } from '../components/summary/names.ts';
import { toCrewNames } from '../components/summary/toCrewNames.ts';
import { type StreamingRank, toExternalRatings } from '../components/summary/toExternalRatings.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import { toMovieLinks } from './toMovieLinks.ts';

interface Release {
  readonly country: string;
  readonly release_date: string;
  readonly release_type?: string;
}

interface MovieSummaryParams {
  movie: MovieResponse;
  ratings: RatingsResponse | null;
  stats: MovieStatsResponse | null;
  people: PeopleResponse | null;
  studios: readonly StudioResponse[];
  /** Every country's releases, from `/movies/:id/releases`. */
  releases: readonly Release[];
  collection: { list: ListResponse; items: readonly ListedMovieResponse[] } | null;
  rank: StreamingRank | null;
  /** The viewer's watch-now country, lowercase. */
  country: string;
  /** The viewer's "other site ratings" setting; on when logged out. */
  otherSiteRatings: boolean;
  /** The viewer's "display early ratings" setting. */
  earlyRatings: boolean;
  /** VIPs get the country, language, genre and studio facts as filter links. */
  isVip: boolean;
  now: Date;
}

const popular = (param: string, value: string | number) => `/movies/popular?${param}=${value}`;

function neighbours({ collection, movie }: Pick<MovieSummaryParams, 'collection' | 'movie'>) {
  if (!collection) return {};
  const index = collection.items.findIndex((item) => item.movie.ids.trakt === movie.ids.trakt);
  if (index < 0) return {};

  const link = (item: ListedMovieResponse | undefined, direction: string) =>
    item && {
      href: `/movies/${item.movie.ids.slug}`,
      label: `${direction} in ${collection.list.name}: ${item.movie.title}`,
    };
  return {
    previous: index > 0 ? link(collection.items.at(index - 1), 'Previous') : undefined,
    next: link(collection.items.at(index + 1), 'Next'),
  };
}

function cast(people: PeopleResponse | null): CastMember[] {
  return (people?.cast ?? []).map((member) => ({
    name: member.person.name,
    href: `/people/${member.person.ids.slug}`,
    characters: (member.characters ?? []).join(', '),
    image: imageUrl(member.images?.headshot?.at(0), 'thumb'),
  }));
}

/** Everything the movie summary shows, from the loader's API responses. Dates stay ISO; the page formats them. */
export function toMovieSummary(params: MovieSummaryParams) {
  const { movie, stats, releases, collection, now, isVip } = params;
  const slug = movie.ids.slug;
  const href = `/movies/${slug}`;
  const released = movie.released ?? undefined;

  const usPhysical = releases
    .filter(({ country, release_type }) => country === 'us' && release_type === 'physical')
    .map(({ release_date }) => release_date)
    .toSorted()
    .at(0);
  const earliest = releases.map(({ release_date }) => release_date).toSorted().at(0) ?? released;
  const showRating = params.earlyRatings || (!!earliest && new Date(earliest) <= now);
  const releasedStatus = [undefined, null, 'released', 'in production', 'post production'].includes(movie.status);

  const count = (value: number | undefined, one: string, many: string, link?: string) => ({
    count: value ?? 0,
    label: value === 1 ? one : many,
    href: link,
  });

  return {
    updatedAt: movie.updated_at ?? null,
    id: movie.ids.trakt,
    slug,
    href,
    title: movie.title,
    year: movie.year ?? null,
    fullTitle: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    certification: movie.certification ?? null,
    fanart: imageUrl(movie.images?.fanart?.at(0), 'full'),
    poster: imageUrl(movie.images?.poster?.at(0), 'medium'),
    collection: collection && {
      title: collection.list.name,
      href: `/lists/official/${collection.list.ids.slug}`,
      ...neighbours(params),
    },
    rating: showRating ? { value: movie.rating ?? 0, votes: movie.votes ?? 0, href: `${href}/stats` } : undefined,
    external: params.otherSiteRatings
      ? toExternalRatings({
        ratings: params.ratings,
        rank: params.rank,
        countryName: countryName(params.country),
      })
      : [],
    counts: [
      count(stats?.watchers, 'watcher', 'watchers'),
      count(stats?.plays, 'play', 'plays'),
      count(stats?.collectors, 'library', 'libraries'),
      count(stats?.comments, 'comment', 'comments', `${href}/comments`),
      count(stats?.lists, 'list', 'lists', `${href}/lists`),
      count(stats?.favorited, 'favorited', 'favorited'),
    ],
    commentCount: stats?.comments ?? movie.comment_count ?? 0,
    listCount: stats?.lists ?? 0,
    facts: {
      status: movie.status && movie.status !== 'released' ? titleize(movie.status) : undefined,
      released: released && releasedStatus
        ? { date: released, upcoming: new Date(released) > now, more: Math.max(releases.length - 1, 0) }
        : undefined,
      dvd: usPhysical,
      runtime: movie.runtime ?? undefined,
      ...toCrewNames(params.people),
      country: movie.country
        ? {
          name: countryName(movie.country),
          href: isVip ? popular('countries', movie.country) : undefined,
        }
        : undefined,
      languages: (movie.languages ?? []).map((code) => ({
        name: languageName(code),
        href: isVip ? popular('languages', code) : undefined,
      })),
      studios: params.studios.map(({ name, ids }) => ({
        name,
        href: isVip ? popular('studio_ids', ids.trakt) : undefined,
      })),
      genres: (movie.genres ?? []).map((genre) => ({
        name: titleize(genre),
        href: isVip ? popular('genres', genre) : undefined,
      })),
      originalTitle: movie.original_title && movie.original_title.toLowerCase() !== movie.title.toLowerCase()
        ? movie.original_title
        : undefined,
    },
    tagline: movie.tagline ?? null,
    overview: movie.overview ?? null,
    videos: {
      trailer: movie.trailer ?? null,
      duringCredits: movie.during_credits ?? null,
      afterCredits: movie.after_credits ?? null,
    },
    links: toMovieLinks(params),
    cast: cast(params.people),
  };
}
