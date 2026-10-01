import type { ListsMode } from './ListsMode.ts';
import { listSorts } from './listSorts.ts';

/** The sort menu for a lists index. Rank is the owner's order, so collaborations don't have it. */
export function sortsFor(mode: ListsMode) {
  return mode === 'personal' ? listSorts : listSorts.filter(({ id }) => id !== 'rank');
}
