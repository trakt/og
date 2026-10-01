import { PLACEHOLDER_AVATAR } from '../components/comments/authorOf.ts';
import { episodeNumber } from '../components/media/episodeTags.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { SocialActivity } from './socialActivitySchema.ts';

/** One Social Feed card. */
export type SocialPlay = {
  /** The activity's id. */
  readonly key: number;
  /** The movie or episode. */
  readonly href: string;
  /** The poster's tooltip and name: "Breaking Bad 5x14 Ozymandias", "Heat (1995)". */
  readonly fullTitle: string;
  /** The movie's or the show's poster. */
  readonly image?: string;
  /** Who watched it. Left without `href` for a deleted member. */
  readonly member: { readonly name: string; readonly href?: string; readonly avatar: string };
  /** What they watched: `Breaking Bad 5x14 "Ozymandias"` or "Heat (1995)". */
  readonly watched: string;
  /** When, as OG's `format_date`: "Sep 29, 2026 8:09pm". */
  readonly date: string;
};

function memberOf(user: SocialActivity['user']): SocialPlay['member'] {
  const avatar = user.images?.avatar.full ?? PLACEHOLDER_AVATAR;
  if (user.deleted || !user.ids.slug) return { name: 'Deleted', avatar: PLACEHOLDER_AVATAR };

  return { name: user.name?.trim() || user.username, href: `/users/${user.ids.slug}`, avatar };
}

/**
 * A followed member's play as OG's network item: the poster (a show's for an episode), the member, "watched" and the
 * title (`item_top_title` plus `item_title(episode_quotes: true)` for an episode, `item_full_title` for a movie), and
 * the watched date.
 */
export function toSocialPlay(activity: SocialActivity, datePreferences: DatePreferences): SocialPlay {
  const common = {
    key: activity.id,
    member: memberOf(activity.user),
    date: formatDate(activity.activity_at, { ...datePreferences, time: true }),
  };

  if (activity.type === 'movie') {
    const { movie } = activity;
    const title = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    return {
      ...common,
      href: `/movies/${movie.ids.slug}`,
      fullTitle: title,
      image: imageUrl(movie.images?.poster?.at(0), 'thumb'),
      watched: title,
    };
  }

  const { episode, show } = activity;
  const number = episodeNumber(episode, show.genres);
  return {
    ...common,
    href: `/shows/${show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`,
    fullTitle: [show.title, number, episode.title].filter(Boolean).join(' '),
    image: imageUrl(show.images?.poster?.at(0), 'thumb'),
    watched: episode.title ? `${show.title} ${number} "${episode.title}"` : `${show.title} ${number}`,
  };
}
