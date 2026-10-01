import { episodeNumber, episodeType } from '../../components/media/episodeTags.ts';
import type { OnDeckItem } from '../../components/media/OnDeckItem.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import type { ProgressRowData } from './progressRowsSchema.ts';

type ToProgressOnDeckParams = {
  row: ProgressRowData;
  /** The profile's slug, for the progress bar's link. */
  username: string;
};

/**
 * Grid view's card: the next
 * episode as the dashboard's on-deck card. A show with nothing left to watch gets no on-deck card; the page draws
 * the show's own poster instead, like OG.
 */
export function toProgressOnDeck({ row, username }: ToProgressOnDeckParams): OnDeckItem | undefined {
  const { show, progress } = row;
  const episode = progress.next_episode;
  if (!episode) return undefined;

  const label = episodeType(episode);
  return {
    showId: show.ids.trakt,
    showTitle: show.title,
    showHref: `/shows/${show.ids.slug}`,
    episodeId: episode.ids.trakt,
    episodeHref: `/shows/${show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`,
    episodeNumber: episodeNumber(episode, show.genres),
    episodeTitle: episode.title ?? undefined,
    episodeBadge: label ? { label: label.text, kind: label.kind } : undefined,
    poster: imageUrl(show.images?.poster?.at(0), 'thumb'),
    rating: episode.rating ?? undefined,
    runtime: episode.runtime ?? show.runtime ?? undefined,
    progressHref: `/users/${username}/progress?show=${show.ids.trakt}`,
    progress: {
      aired: progress.aired,
      completed: progress.completed,
      plays: progress.stats?.play_count ?? 0,
      minutesWatched: progress.stats?.minutes_watched,
      minutesLeft: progress.stats?.minutes_left,
    },
    rewatching: Boolean(progress.reset_at),
  };
}
