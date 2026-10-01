import type { ProgressHide } from './progressHide.ts';
import type { ProgressItem } from './ProgressItem.ts';

type FilterProgressParams = {
  hide: readonly ProgressHide[];
  /** The title search. */
  terms?: string;
  /** `?list=`: only shows on that list. */
  listed?: ReadonlySet<number>;
};

const ENDED = new Set(['ended', 'canceled']);

const HIDES: Record<ProgressHide, (item: ProgressItem) => boolean> = {
  completed: ({ aired, completed }) => aired > 0 && completed >= aired,
  'not-completed': ({ aired, completed }) => completed < aired,
  ended: ({ show }) => ENDED.has(show.status ?? ''),
  airing: ({ show }) => show.status === 'returning series',
  rewatching: ({ resetAt }) => Boolean(resetAt),
};

/** The HIDE toggles, the title search and the list filter, applied in the browser. */
export function filterProgress(
  items: readonly ProgressItem[],
  { hide, terms, listed }: FilterProgressParams,
): readonly ProgressItem[] {
  const needle = terms?.trim().toLocaleLowerCase();
  return items.filter((item) =>
    !hide.some((id) => HIDES[id](item)) &&
    (!needle || item.show.title.toLocaleLowerCase().includes(needle)) &&
    (!listed || listed.has(item.show.id))
  );
}
