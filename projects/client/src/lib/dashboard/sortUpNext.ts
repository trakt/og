import type { UpNextEntry } from '../progress/UpNextEntry.ts';
import type { UpNextSortBy } from './upNextSorts.ts';

type SortUpNextParams = {
  entries: readonly UpNextEntry[];
  by: UpNextSortBy;
  how: 'asc' | 'desc';
  /** Only for `random`: 0 to 1, like `Math.random`. */
  random?: () => number;
};

type Key = (entry: UpNextEntry) => number;

const percent = ({ progress }: UpNextEntry) => (progress.aired > 0 ? progress.completed / progress.aired : 0);
const airedAt = ({ progress }: UpNextEntry) => Date.parse(progress.next_episode?.first_aired ?? '') || 0;
const runtime = ({ show, progress }: UpNextEntry) => progress.next_episode?.runtime ?? show.runtime ?? 0;

/**
 * Each sort's key and whether OG's `asc` puts the highest first:
 * most completed, least time left, most plays, the newest next episode, the most voted show (og's stand-in for OG's
 * popularity rank) and the shortest next episode.
 */
const KEYS: Partial<Record<UpNextSortBy, { key: Key; highestFirst: boolean }>> = {
  completed: { key: percent, highestFirst: true },
  time: { key: ({ progress }) => progress.stats?.minutes_left ?? 0, highestFirst: false },
  plays: { key: ({ progress }) => progress.stats?.play_count ?? 0, highestFirst: true },
  released: { key: airedAt, highestFirst: true },
  popularity: { key: ({ show }) => show.votes ?? 0, highestFirst: true },
  runtime: { key: runtime, highestFirst: false },
};

/**
 * The Up Next sorts the worker doesn't have, applied to the entries it sent. Ties go to the higher show id, as OG's did;
 * `desc` is the reverse of `asc`. Sorts the worker has come back as they are.
 */
export function sortUpNext({ entries, by, how, random = Math.random }: SortUpNextParams): readonly UpNextEntry[] {
  if (by === 'random') {
    return entries.map((entry) => ({ entry, at: random() })).toSorted((a, b) => a.at - b.at).map(({ entry }) => entry);
  }

  const sort = KEYS[by];
  if (!sort) return entries;

  const direction = sort.highestFirst ? -1 : 1;
  const ascending = entries.toSorted((a, b) =>
    direction * (sort.key(a) - sort.key(b)) || b.show.ids.trakt - a.show.ids.trakt
  );
  return how === 'desc' ? ascending.toReversed() : ascending;
}
