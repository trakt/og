import type {
  EpisodeResponse,
  EpisodeStatsResponse,
  RatingsResponse,
  SeasonsResponse,
  ShowResponse,
  VideoResponse,
} from '@trakt/api';
import type { z } from 'zod/v4';
import { iconLinks } from '../components/summary/iconLinks.ts';
import { countryName, languageName, titleize } from '../components/summary/names.ts';
import { toCastMembers } from '../components/summary/toCastMembers.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { countLabel } from '../utils/countLabel.ts';
import { formatDate } from '../utils/formatDate.ts';
import { formatRuntime } from '../utils/formatRuntime.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import { seasonNeighbours } from './seasonNeighbours.ts';
import type { seasonPeopleSchema } from './seasonPeopleSchema.ts';
import { toShowEpisodes } from './toShowEpisodes.ts';

interface Params {
  show: ShowResponse;
  season: SeasonsResponse[number];
  seasons: SeasonsResponse;
  episodes: EpisodeResponse[];
  ratings: RatingsResponse;
  stats: EpisodeStatsResponse;
  people: z.infer<typeof seasonPeopleSchema>;
  videos?: readonly VideoResponse[];
  isVip: boolean;
  actorSpoilers: boolean;
  episodeTypeTags: boolean;
  earlyRatings: boolean;
  datePreferences: DatePreferences;
  now: Date;
}

/** Season-specific facts and navigation; the show episode and cast mappers provide the shared rows. */
export function toSeasonSummary(params: Params) {
  const { show, season, seasons, episodes, stats, ratings, datePreferences, now } = params;
  const showHref = `/shows/${show.ids.slug}`;
  const href = `${showHref}/seasons/${season.number}`;
  const standardTitle = season.number === 0 ? 'Specials' : `Season ${season.number}`;
  const title = season.title || standardTitle;
  const fullTitle = `${show.title}: ${title}`;
  const episodeList = toShowEpisodes({
    show,
    seasons: [{ ...season, episodes }],
    signedIn: true,
    episodeTypeTags: params.episodeTypeTags,
    datePreferences,
    now,
  });
  const first = episodes.toSorted((a, b) => a.number - b.number).at(0)?.first_aired ?? season.first_aired;
  const network = season.network ?? show.network;
  const popular = (key: string, value: string) =>
    params.isVip ? `/shows/popular?${key}=${encodeURIComponent(value)}` : undefined;
  const networkLink = network ? { name: network, href: popular('networks', network.replace('+', '-plus')) } : undefined;
  const aired = episodes.filter(({ first_aired }) => first_aired && new Date(first_aired) <= now);
  const total = season.total_runtime ?? aired.reduce((sum, episode) => sum + (episode.runtime ?? show.runtime ?? 0), 0);
  const count = (value: number, one: string, many: string, link?: string) => ({
    count: value,
    label: value === 1 ? one : many,
    href: link,
  });

  return {
    id: season.ids.trakt,
    number: season.number,
    showId: show.ids.trakt,
    showHref,
    showTitle: show.title,
    parentTitle: title === standardTitle ? show.title : `${show.title}: ${standardTitle}`,
    href,
    title,
    fullTitle,
    years: episodeList.years,
    certification: show.certification,
    fanart: imageUrl(show.images?.fanart?.at(0), 'full'),
    poster: imageUrl(season.images?.poster?.at(0) ?? show.images?.poster?.at(0), 'medium'),
    overview: season.overview || show.overview,
    trailer: params.videos?.find(({ type }) => type === 'trailer')?.url,
    rating: params.earlyRatings || (!!first && new Date(first) <= now)
      ? {
        value: ratings.rating ?? season.rating ?? 0,
        votes: ratings.votes ?? season.votes ?? 0,
        href: `${href}/stats`,
      }
      : undefined,
    counts: [
      count(stats.watchers, 'watcher', 'watchers'),
      count(stats.plays, 'play', 'plays'),
      count(stats.collectors, 'library', 'libraries'),
      count(stats.comments, 'comment', 'comments', `${href}/comments`),
      count(stats.lists, 'list', 'lists', `${href}/lists`),
    ],
    commentCount: stats.comments,
    listCount: stats.lists,
    airedEpisodes: season.aired_episodes ?? aired.length,
    episodeIds: aired.toSorted((a, b) => a.number - b.number).map(({ ids }) => ids.trakt),
    runtime: show.runtime ?? undefined,
    facts: {
      premiere: first
        ? {
          label: new Date(first) > now ? 'Premieres' : 'Premiered',
          date: formatDate(first, { ...datePreferences, format: 'LL' }),
        }
        : undefined,
      network: networkLink,
      runtime: show.runtime ? formatRuntime(show.runtime) : undefined,
      totalRuntime: total > 0
        ? { time: formatRuntime(total), episodes: countLabel(season.aired_episodes ?? aired.length, 'episode') }
        : undefined,
      country: show.country ? { name: countryName(show.country), href: popular('countries', show.country) } : undefined,
      languages: (show.languages ?? []).map((code) => ({ name: languageName(code), href: popular('languages', code) })),
      genres: (show.genres ?? []).map((genre) => ({ name: titleize(genre), href: popular('genres', genre) })),
    },
    links: [
      ...(show.ids.imdb
        ? [{ label: 'IMDB', href: `https://www.imdb.com/title/${show.ids.imdb}/episodes/?season=${season.number}` }]
        : []),
      ...(show.ids.tmdb
        ? [{ label: 'TMDB', href: `https://www.themoviedb.org/tv/${show.ids.tmdb}/season/${season.number}` }]
        : []),
      ...(show.ids.tvdb ? [{ label: 'Fanart.tv', href: `https://fanart.tv/series/${show.ids.tvdb}` }] : []),
      ...iconLinks({ social: null, search: `${show.title} ${title}` }),
    ],
    cast: toCastMembers(params.people.cast, params.actorSpoilers),
    guestStars: toCastMembers(params.people.guest_stars, params.actorSpoilers),
    episodes: episodeList.rows,
    seasonLinks: [
      ...seasons.toSorted((a, b) => b.number - a.number).map(({ number }) => ({
        text: number === 0 ? 'Specials' : `${number}`,
        href: `${showHref}/seasons/${number}`,
        selected: number === season.number,
      })),
      { text: 'All', href: `${showHref}/seasons/all`, selected: false },
    ],
    ...seasonNeighbours({ showHref, number: season.number, seasons }),
  };
}
