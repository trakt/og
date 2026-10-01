import type { CommentResponse } from '@trakt/api';
import type { CommentItem } from './CommentItem.ts';

export type WatchedIndicator = {
  /** The bold number: "100%" or "3". */
  readonly count: string;
  /** "Watched", "play" or "plays". */
  readonly label: string;
  /** The tooltip on shows and seasons: "5/62 episodes", then "9 plays". */
  readonly title?: string;
  readonly href: string;
};

const plural = (count: number, word: string) => `${word}${count === 1 ? '' : 's'}`;

/**
 * The author's watched state under the text: shows and
 * seasons as a percentage of aired episodes, anything else (and a show at 0%) as plays. It links to the author's
 * history for the item. `undefined` when they haven't watched it.
 */
export function watchedIndicator(
  { stats, slug, item }: { stats: CommentResponse['user_stats']; slug: string; item: CommentItem },
): WatchedIndicator | undefined {
  if (stats.play_count <= 0 || item.type === 'list') return undefined;

  const href = `/users/${slug}/history?${item.type}=${item.id}`;
  const plays = { count: stats.play_count.toLocaleString('en-US'), label: plural(stats.play_count, 'play'), href };
  if (item.type !== 'show' && item.type !== 'season') return plays;

  const aired = item.airedEpisodes ?? 0;
  const title = `${stats.completed_count}/${aired} ${plural(aired, 'episode')}\n${plays.count} ${plays.label}`;
  const percentage = aired > 0 ? Math.min(Math.floor((stats.completed_count / aired) * 100), 100) : 0;
  return percentage > 0 ? { count: `${percentage}%`, label: 'Watched', title, href } : { ...plays, title };
}
