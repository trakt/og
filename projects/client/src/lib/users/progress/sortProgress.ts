import type { ProgressItem } from './ProgressItem.ts';
import { literalProgressSort, type ProgressSort } from './progressSort.ts';

type Key = (item: ProgressItem) => number | string;

const date = (value: string | undefined) => Date.parse(value ?? '') || 0;
const percent = ({ aired, completed }: ProgressItem) => (aired > 0 ? completed / aired : 0);

const KEYS: Record<ReturnType<typeof literalProgressSort>['by'], Key> = {
  added: ({ lastAt }) => date(lastAt),
  completed: percent,
  episodes: ({ aired, completed }) => Math.max(aired - completed, 0),
  time: ({ minutesLeft }) => minutesLeft,
  plays: ({ plays }) => plays,
  released: ({ show }) => date(show.lastAired),
  premiered: ({ show }) => date(show.firstAired),
  title: ({ show }) => show.title.toLocaleLowerCase(),
  // The API has no popularity rank, so votes stand in, as on the dashboard (`sortUpNext.ts`).
  popularity: ({ show }) => show.votes ?? 0,
  runtime: ({ show }) => show.runtime ?? 0,
  'total-runtime': ({ show, aired }) => show.totalRuntime ?? (show.runtime ?? 0) * aired,
  // Replaced by `random` below.
  random: () => 0,
};

const compare = (a: number | string, b: number | string) =>
  typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);

/** A stable 0-1 number for a show, so a random order holds still while the rows recompute. */
const shuffle = (seed: number) => ({ show }: ProgressItem) => {
  const hashed = Math.imul(show.id ^ seed, 2_654_435_761) >>> 0;
  return hashed / 2 ** 32;
};

/**
 * The tab's sort, applied in the browser. Ties go to the higher show id either way. `seed`
 * fixes Random's order for the page's lifetime.
 */
export function sortProgress(
  items: readonly ProgressItem[],
  sort: Pick<ProgressSort, 'by' | 'how'>,
  seed = 0,
): readonly ProgressItem[] {
  const { by, how } = literalProgressSort(sort);
  const key = by === 'random' ? shuffle(seed) : KEYS[by];
  const direction = how === 'desc' ? -1 : 1;
  return items
    .map((item) => ({ item, value: key(item) }))
    .toSorted((a, b) => direction * compare(a.value, b.value) || b.item.show.id - a.item.show.id)
    .map(({ item }) => item);
}
