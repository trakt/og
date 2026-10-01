import { commentItemOf } from '../../components/comments/commentItemOf.ts';
import { episodeNumber } from '../../components/media/episodeTags.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import type { UserComment } from './UserComment.ts';
import type { UserCommentRow } from './UserCommentRow.ts';

type Poster = UserComment['poster'];

const showHref = (show: { readonly ids: { readonly slug: string } }) => `/shows/${show.ids.slug}`;
const seasonName = (season: { title?: string | null; number: number }) =>
  season.title?.trim() || (season.number === 0 ? 'Specials' : `Season ${season.number}`);
const thumb = (path: string | null | undefined) => imageUrl(path, 'thumb');

function commentPoster(row: UserCommentRow): Poster | undefined {
  const { movie, show, season, episode, list } = row;

  if (row.type === 'movie' && movie) {
    return {
      type: 'movie',
      id: movie.ids.trakt,
      href: `/movies/${movie.ids.slug}`,
      title: movie.title,
      image: thumb(movie.images?.poster?.at(0)),
      variant: 'poster',
      rating: movie.rating ?? undefined,
    };
  }
  if (row.type === 'show' && show) {
    return {
      type: 'show',
      id: show.ids.trakt,
      href: showHref(show),
      title: show.title,
      image: thumb(show.images?.poster?.at(0)),
      variant: 'poster',
      rating: show.rating ?? undefined,
      airedEpisodes: show.aired_episodes ?? undefined,
    };
  }
  if (row.type === 'season' && season && show) {
    return {
      type: 'season',
      id: season.ids.trakt,
      href: `${showHref(show)}/seasons/${season.number}`,
      title: seasonName(season),
      image: thumb(season.images?.poster?.at(0) ?? show.images?.poster?.at(0)),
      variant: 'poster',
      show: { text: show.title, href: showHref(show) },
      seasonOf: { show: show.ids.trakt, number: season.number },
      rating: season.rating ?? undefined,
      airedEpisodes: season.aired_episodes ?? undefined,
    };
  }
  if (row.type === 'episode' && episode && show) {
    return {
      type: 'episode',
      id: episode.ids.trakt,
      href: `${showHref(show)}/seasons/${episode.season}/episodes/${episode.number}`,
      title: episode.title ?? '',
      number: episodeNumber(episode, show.genres),
      image: thumb(episode.images?.screenshot?.at(0)),
      variant: 'screenshot',
      show: { text: show.title, href: showHref(show) },
      rating: episode.rating ?? undefined,
    };
  }
  // OG skipped comments on private lists.
  if (row.type === 'list' && list && list.privacy === 'public' && list.user?.ids.slug) {
    return {
      type: 'list',
      id: list.ids.trakt,
      href: `/users/${list.user.ids.slug}/lists/${list.ids.slug ?? list.ids.trakt}`,
      title: list.name,
      image: thumb(list.images?.posters?.at(0)),
      variant: 'poster',
    };
  }
  return undefined;
}

/** A user comment row as a comment beside its poster, or `null` for one OG wouldn't show. */
export function toUserComment(row: UserCommentRow): UserComment | null {
  const poster = commentPoster(row);
  const item = commentItemOf(row);
  if (!poster || !item) return null;

  const title = [poster.number, poster.title].filter(Boolean).join(' ');
  return {
    comment: row.comment,
    item,
    inlineTitle: poster.show ? `${poster.show.text}: ${title}` : title,
    poster,
  };
}
