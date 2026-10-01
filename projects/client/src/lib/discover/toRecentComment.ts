import type { CommentResponse } from '@trakt/api';
import { commentItemOf } from '../components/comments/commentItemOf.ts';
import type { CommentItem } from '../components/comments/CommentItem.ts';
import { episodeNumber } from '../components/media/episodeTags.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { RecentCommentRow } from './recentCommentRowsSchema.ts';

/** One of the Recent Comments block's titles and the comment it selects. */
export type RecentComment = {
  readonly comment: CommentResponse;
  readonly item: CommentItem;
  readonly href: string;
  /** OG's `item_top_title`: the movie or show, a season or episode's show, or the list's name. */
  readonly title: string;
  /** The item's own year: a season or episode's is the year it first aired. Lists have none. */
  readonly year?: number;
  /** The line under a season or episode's title: "Season 2", or "3x03" and the episode title. */
  readonly subtitle?: { readonly number?: string; readonly title: string };
  /** OG's `item_top_fanart`: a season or episode uses its show's, since the API gives them none. */
  readonly fanart?: string;
  /** A list's fanart comes from its items, which the block reads when it's selected. */
  readonly listId?: number;
};

const fanartOf = (images: { fanart?: readonly string[] | null } | null | undefined) =>
  imageUrl(images?.fanart?.at(0), 'full');
const yearOf = (date: string | null | undefined) => date ? new Date(date).getUTCFullYear() : undefined;
const showHref = (show: { ids: { slug: string } }) => `/shows/${show.ids.slug}`;

type Titles = Omit<RecentComment, 'comment' | 'item'>;

function titlesOf({ type, movie, show, season, episode, list }: RecentCommentRow): Titles | undefined {
  if (type === 'movie' && movie) {
    return {
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      year: movie.year ?? undefined,
      fanart: fanartOf(movie.images),
    };
  }
  if (type === 'show' && show) {
    return { href: showHref(show), title: show.title, year: show.year ?? undefined, fanart: fanartOf(show.images) };
  }
  if (type === 'season' && season && show) {
    return {
      href: `${showHref(show)}/seasons/${season.number}`,
      title: show.title,
      year: yearOf(season.first_aired),
      subtitle: { title: season.number === 0 ? 'Specials' : `Season ${season.number}` },
      fanart: fanartOf(show.images),
    };
  }
  if (type === 'episode' && episode && show) {
    return {
      href: `${showHref(show)}/seasons/${episode.season}/episodes/${episode.number}`,
      title: show.title,
      year: yearOf(episode.first_aired),
      subtitle: { number: episodeNumber(episode, show.genres), title: episode.title?.trim() ?? '' },
      fanart: fanartOf(show.images),
    };
  }
  if (type === 'list' && list) {
    const owner = list.user?.ids.slug;
    return {
      href: list.type === 'personal' && owner
        ? `/users/${owner}/lists/${list.ids.slug ?? list.ids.trakt}`
        : `/lists/${list.ids.trakt}`,
      title: list.name,
      listId: list.ids.trakt,
    };
  }
  return undefined;
}

/** A `/comments/recent` row as a Recent Comments entry, or `null` for an item OG couldn't show. */
export function toRecentComment(row: RecentCommentRow): RecentComment | null {
  const titles = titlesOf(row);
  const item = commentItemOf(row);
  if (!titles || !item) return null;

  return { ...titles, comment: row.comment, item };
}
