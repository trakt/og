import type { UserListRow } from './UserListRow.ts';

/** Move a list to a 1-based position, clamped to the complete order, and renumber it. */
export function moveList({ rows, key, rank }: {
  rows: readonly UserListRow[];
  key: string;
  rank: number;
}): readonly UserListRow[] {
  const from = rows.findIndex((row) => row.key === key);
  const row = rows.at(from);
  if (from < 0 || !row || !Number.isSafeInteger(rank)) return rows;
  const to = Math.max(0, Math.min(rows.length - 1, rank - 1));
  if (from === to) return rows;
  return rows.toSpliced(from, 1).toSpliced(to, 0, row).map((row, i) => ({ ...row, rank: i + 1 }));
}
