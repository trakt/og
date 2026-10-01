import type { SearchResultResponse } from '@trakt/api';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { imageUrl } from '../../utils/imageUrl.ts';

/** One autocomplete row. */
export interface SearchRow {
  readonly key: string;
  readonly recent: { readonly query: string; readonly type: string; readonly id: number };
  readonly href: string;
  /** The show's title above an episode. */
  readonly topTitle?: string;
  readonly title: string;
  /** OG's type tag: the model name, titleized. */
  readonly type: string;
  /** The year, or an episode's first-aired date. */
  readonly tag?: string;
  readonly genres?: string;
  readonly poster?: string;
  /** A user's avatar, which OG drew square and round (`.poster.square`, `[data-type="users"]`), not a poster. */
  readonly avatar?: boolean;
}

const genres = (slugs: ReadonlyArray<string> | null | undefined) =>
  slugs?.length ? slugs.join(', ').replaceAll('-', ' ') : undefined;

const year = (value: number | null | undefined) => (value ? String(value) : undefined);

const poster = (paths: ReadonlyArray<string> | null | undefined) => imageUrl(paths?.at(0), 'thumb');

// OG's season_x_episode: "1x05", or "Special 3" for season 0.
const seasonEpisode = (season: number, number: number) =>
  season === 0 ? `Special ${number}` : `${season}x${String(number).padStart(2, '0')}`;

/** Maps a `/search` hit to the row OG drew for it, dating episodes in the viewer's order and zone. Returns null for a hit missing the object its `type` names. */
export function toSearchRow(
  hit: SearchResultResponse,
  dates: Pick<DatePreferences, 'order' | 'timeZone'> = { order: 'mdy', timeZone: 'UTC' },
): SearchRow | null {
  const { movie, show, episode, person, list } = hit;

  if (hit.type === 'movie' && movie) {
    return {
      key: `movie-${movie.ids.trakt}`,
      recent: { query: movie.title, type: 'movies', id: movie.ids.trakt },
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      type: 'Movie',
      tag: year(movie.year),
      genres: genres(movie.genres),
      poster: poster(movie.images?.poster),
    };
  }

  if (hit.type === 'show' && show) {
    return {
      key: `show-${show.ids.trakt}`,
      recent: { query: show.title, type: 'shows', id: show.ids.trakt },
      href: `/shows/${show.ids.slug}`,
      title: show.title,
      type: 'Show',
      tag: year(show.year),
      genres: genres(show.genres),
      poster: poster(show.images?.poster),
    };
  }

  if (hit.type === 'episode' && episode && show) {
    return {
      key: `episode-${episode.ids.trakt}`,
      recent: { query: episode.title ?? '', type: 'episodes', id: episode.ids.trakt },
      href: `/shows/${show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`,
      topTitle: show.title,
      title: `${seasonEpisode(episode.season, episode.number)} ${episode.title ?? ''}`.trim(),
      type: 'Episode',
      tag: episode.first_aired ? formatDate(episode.first_aired, dates) : undefined,
      genres: genres(show.genres),
      poster: poster(show.images?.poster),
    };
  }

  if (hit.type === 'person' && person) {
    return {
      key: `person-${person.ids.trakt}`,
      recent: { query: person.name, type: 'people', id: person.ids.trakt },
      href: `/people/${person.ids.slug}`,
      title: person.name,
      type: 'Person',
      poster: poster(person.images?.headshot),
    };
  }

  if (hit.type === 'list' && list) {
    return {
      key: `list-${list.ids.trakt}`,
      recent: { query: list.name, type: list.type === 'official' ? 'official_lists' : 'lists', id: list.ids.trakt },
      href: `/lists/${list.ids.trakt}`,
      title: list.name,
      type: list.type === 'official' ? 'Official List' : 'List',
      poster: poster(list.images?.posters),
    };
  }

  return null;
}
