import type { CommentItem } from './CommentItem.ts';

type Ids = { readonly trakt: number };
type Movie = { readonly ids: Ids; readonly title?: string | null; readonly year?: number | null };
type Show = Movie & { readonly aired_episodes?: number | null };
type Season = { readonly ids: Ids; readonly number: number; readonly aired_episodes?: number | null };
type Episode = { readonly ids: Ids; readonly season: number; readonly number: number; readonly title?: string | null };
type List = { readonly ids: Ids; readonly name: string };

/**
 * What the comment routes return beside a comment: `/comments/:id/item` and every `/users/:id/comments` row both carry
 * a `type` and the media under that key, with the show next to a season or episode.
 */
export type CommentItemSource = {
  readonly type: string;
  readonly movie?: Movie | null;
  readonly show?: Show | null;
  readonly season?: Season | null;
  readonly episode?: Episode | null;
  readonly list?: List | null;
};

const trim = (title: string | null | undefined) => title?.trim() ?? '';
const aired = (count: number | null | undefined) => count ?? undefined;

// OG's full titles, the share sheet's title.
const seasonTitle = (show: Show, number: number) =>
  `${trim(show.title)} ${number === 0 ? 'Specials' : `Season ${number}`}`.trim();

function episodeTitle(show: Show, episode: Episode): string {
  const number = episode.season === 0
    ? `Special ${episode.number}`
    : `${episode.season}x${String(episode.number).padStart(2, '0')}`;
  const title = trim(episode.title);
  return [trim(show.title), number, title && `"${title}"`].filter(Boolean).join(' ');
}

/** The card's {@link CommentItem} from a comment route's media, or `undefined` for a type the card doesn't know. */
export function commentItemOf(source: CommentItemSource): CommentItem | undefined {
  const { type, movie, show, season, episode, list } = source;

  if (type === 'movie' && movie) {
    const title = movie.year ? `${trim(movie.title)} (${movie.year})` : trim(movie.title);
    return { type: 'movie', id: movie.ids.trakt, title };
  }
  if (type === 'show' && show) {
    return { type: 'show', id: show.ids.trakt, title: trim(show.title), airedEpisodes: aired(show.aired_episodes) };
  }
  if (type === 'season' && season && show) {
    return {
      type: 'season',
      id: season.ids.trakt,
      title: seasonTitle(show, season.number),
      show: show.ids.trakt,
      number: season.number,
      airedEpisodes: aired(season.aired_episodes),
    };
  }
  if (type === 'episode' && episode && show) {
    return {
      type: 'episode',
      id: episode.ids.trakt,
      title: episodeTitle(show, episode),
      show: show.ids.trakt,
      season: episode.season,
    };
  }
  if (type === 'list' && list) return { type: 'list', id: list.ids.trakt, title: list.name };
  return undefined;
}
