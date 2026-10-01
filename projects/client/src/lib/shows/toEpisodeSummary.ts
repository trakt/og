import type {
  EpisodeResponse,
  EpisodeStatsResponse,
  PeopleResponse,
  RatingsResponse,
  SeasonsResponse,
  ShowResponse,
  VideoResponse,
} from '@trakt/api';
import type { z } from 'zod/v4';
import { episodeNumber, episodeType } from '../components/media/episodeTags.ts';
import { iconLinks } from '../components/summary/iconLinks.ts';
import { countryName, languageName, titleize } from '../components/summary/names.ts';
import { toCastMembers } from '../components/summary/toCastMembers.ts';
import { toCrewNames } from '../components/summary/toCrewNames.ts';
import { toExternalRatings } from '../components/summary/toExternalRatings.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import { formatRuntime } from '../utils/formatRuntime.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import { episodeNeighbours } from './episodeNeighbours.ts';
import type { episodeSeasonsSchema } from './episodeSeasonsSchema.ts';
import type { seasonPeopleSchema } from './seasonPeopleSchema.ts';

interface Params {
  show: ShowResponse;
  season: SeasonsResponse[number];
  episode: EpisodeResponse;
  episodes: readonly EpisodeResponse[];
  seasons: z.infer<typeof episodeSeasonsSchema>;
  people: PeopleResponse;
  regulars: z.infer<typeof seasonPeopleSchema>;
  ratings: RatingsResponse;
  stats: EpisodeStatsResponse;
  videos: readonly VideoResponse[];
  datePreferences: DatePreferences;
  now: Date;
  isVip: boolean;
  episodeTypeTags: boolean;
  earlyRatings: boolean;
  otherSiteRatings: boolean;
}

/** Episode facts, the season number strip and neighbours across seasons in broadcast order. */
export function toEpisodeSummary(params: Params) {
  const { show, episode, season, ratings, stats, now } = params;
  const showHref = `/shows/${show.ids.slug}`;
  const seasonHref = `${showHref}/seasons/${episode.season}`;
  const href = `${seasonHref}/episodes/${episode.number}`;
  const number = episodeNumber(episode, show.genres);
  const title = episode.title || `Episode ${episode.number}`;
  const fullTitle = `${show.title} ${number} ${title}`;
  const popular = (key: string, value: string) =>
    params.isVip ? `/shows/popular?${key}=${encodeURIComponent(value)}` : undefined;
  const count = (value: number, one: string, many: string, link?: string) => ({
    count: value,
    label: value === 1 ? one : many,
    href: link,
  });
  return {
    id: episode.ids.trakt,
    showId: show.ids.trakt,
    slug: show.ids.slug,
    showTitle: show.title,
    showHref,
    seasonHref,
    href,
    season: episode.season,
    episodeNumber: episode.number,
    number,
    title,
    fullTitle,
    seasonTitle: season.title || (episode.season === 0 ? 'Specials' : `Season ${episode.season}`),
    year: episode.first_aired ? new Date(episode.first_aired).getUTCFullYear() : undefined,
    certification: show.certification,
    type: params.episodeTypeTags ? episodeType(episode) : undefined,
    fanart: imageUrl(show.images?.fanart?.at(0), 'full'),
    screenshot: imageUrl(episode.images?.screenshot?.at(0), 'full'),
    poster: imageUrl(season.images?.poster?.at(0) ?? show.images?.poster?.at(0), 'medium'),
    overview: episode.overview,
    runtime: episode.runtime ?? show.runtime ?? undefined,
    rating: params.earlyRatings || (!!episode.first_aired && new Date(episode.first_aired) <= now)
      ? {
        value: ratings.rating ?? episode.rating ?? 0,
        votes: ratings.votes ?? episode.votes ?? 0,
        href: `${href}/stats`,
      }
      : undefined,
    external: params.otherSiteRatings ? toExternalRatings({ ratings, rank: null, countryName: '' }) : [],
    counts: [
      count(stats.watchers, 'watcher', 'watchers'),
      count(stats.plays, 'play', 'plays'),
      count(stats.collectors, 'library', 'libraries'),
      count(stats.comments, 'comment', 'comments', `${href}/comments`),
      count(stats.lists, 'list', 'lists', `${href}/lists`),
    ],
    commentCount: stats.comments,
    listCount: stats.lists,
    facts: {
      aired: episode.first_aired
        ? {
          label: new Date(episode.first_aired) > now ? 'Airs' : 'Aired',
          date: formatDate(episode.first_aired, { ...params.datePreferences, format: 'LL', time: true }),
        }
        : undefined,
      network: show.network
        ? { name: show.network, href: popular('networks', show.network.replace('+', '-plus')) }
        : undefined,
      runtime: episode.runtime ?? show.runtime ? formatRuntime(episode.runtime ?? show.runtime ?? 0) : undefined,
      ...toCrewNames(params.people),
      country: show.country ? { name: countryName(show.country), href: popular('countries', show.country) } : undefined,
      languages: (show.languages ?? []).map((code) => ({ name: languageName(code), href: popular('languages', code) })),
      genres: (show.genres ?? []).map((genre) => ({ name: titleize(genre), href: popular('genres', genre) })),
      originalTitle: episode.original_title && episode.original_title.toLowerCase() !== title.toLowerCase()
        ? episode.original_title
        : undefined,
    },
    videos: {
      trailer: params.videos.find(({ type }) => type === 'trailer')?.url,
      duringCredits: episode.during_credits,
      afterCredits: episode.after_credits,
    },
    cast: toCastMembers(params.regulars.cast, false).map((member) => ({ ...member, episodes: undefined })),
    guestStars: toCastMembers(params.people.cast, false).map((member) => ({ ...member, episodes: undefined })),
    episodeLinks: params.episodes.toSorted((a, b) => a.number - b.number).map((item) => ({
      text: `${item.number}`,
      href: `${seasonHref}/episodes/${item.number}`,
      selected: item.number === episode.number,
    })),
    ...episodeNeighbours({ showHref, genres: show.genres, episode, seasons: params.seasons }),
    links: [
      ...(episode.ids.imdb ? [{ label: 'IMDB', href: `https://www.imdb.com/title/${episode.ids.imdb}` }] : []),
      ...(show.ids.tmdb
        ? [{
          label: 'TMDB',
          href: `https://www.themoviedb.org/tv/${show.ids.tmdb}/season/${episode.season}/episode/${episode.number}`,
        }]
        : []),
      ...(show.ids.tvdb ? [{ label: 'Fanart.tv', href: `https://fanart.tv/series/${show.ids.tvdb}` }] : []),
      ...iconLinks({ social: null, search: fullTitle }),
    ],
  };
}
