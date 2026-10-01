import type { ListSort } from './resolveListSort.ts';

/**
 * A page of cards after the whole list's order changed (`saveListOrder` in `lists.js`): each takes its new rank, and a
 * page sorted by rank puts them back in rank order. A card missing from the order keeps its rank.
 */
export function rerankListCards<T extends { readonly key: number; readonly rank: number }>(
  cards: readonly T[],
  order: readonly number[],
  sort: ListSort,
): readonly T[] {
  const ranks = new Map(order.map((id, i) => [id, i + 1]));
  const next = cards.map((card) => ({ ...card, rank: ranks.get(card.key) ?? card.rank }));
  if (sort.by !== 'rank') return next;
  return next.toSorted((a, b) => sort.how === 'desc' ? b.rank - a.rank : a.rank - b.rank);
}
