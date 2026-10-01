import { countLabel } from '../../utils/countLabel.ts';
import type { WatchedGenreRow } from './watchedGenresSchema.ts';

/** One bar of the profile's Most Watched Genres chart (`users.js:370-414`). */
export type GenreBar = {
  readonly slug: string;
  readonly name: string;
  /** The genre's share of every play: the bar's width. */
  readonly percentage: number;
  /** Its share of the top genre's plays: the bar's width in the phone rows. */
  readonly percentageRow: number;
  /** "14%", over the bar. */
  readonly percentageText: string;
  /** "12 episodes (15)", "3 shows", "4 movies", each linking to that history filtered by the genre. */
  readonly counts: readonly { readonly text: string; readonly href: string }[];
};

const TYPES = [
  { key: 'episodes', word: 'episode' },
  { key: 'shows', word: 'show' },
  { key: 'movies', word: 'movie' },
] as const;

type ToGenreBarOptions = {
  /** Whose history the counts link to. */
  slug: string;
  /** `YYYY-MM-DD`: the history links start there, for a chart of recent plays. */
  startAt?: string;
};

/**
 * A watched genres row as a bar. Each type counts its unique items, with the plays in parentheses when there are
 * more; shows always count once a show, so they never get them.
 */
export function toGenreBar(row: WatchedGenreRow, { slug, startAt }: ToGenreBarOptions): GenreBar {
  const counts = TYPES.flatMap(({ key, word }) => {
    const unique = row[key].ids.length;
    if (unique === 0) return [];

    const plays = row[key].play_count > unique && key !== 'shows'
      ? ` (${row[key].play_count.toLocaleString('en-US')})`
      : '';
    const query = new URLSearchParams({ genres: row.genre.slug, ...(startAt && { start_at: startAt }) });
    return [{ text: `${countLabel(unique, word)}${plays}`, href: `/users/${slug}/history/${key}/plays?${query}` }];
  });

  return {
    slug: row.genre.slug,
    name: row.genre.name,
    percentage: row.percentage,
    percentageRow: row.percentage_row,
    percentageText: `${row.percentage.toFixed(0)}%`,
    counts,
  };
}
