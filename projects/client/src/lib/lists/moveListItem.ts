/** Move a list item to a 1-based position in the whole list's order (OG's `updateRank`), clamped to its ends. */
export function moveListItem(order: readonly number[], id: number, rank: number): readonly number[] {
  const from = order.indexOf(id);
  if (from < 0 || !Number.isSafeInteger(rank)) return order;
  const to = Math.max(0, Math.min(order.length - 1, rank - 1));
  return from === to ? order : order.toSpliced(from, 1).toSpliced(to, 0, id);
}
