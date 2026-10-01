type RoveCellParams = {
  key: string;
  /** The focused cell's season row and position in it. */
  row: number;
  index: number;
  /** Each season row's cell count. */
  lengths: readonly number[];
};

/**
 * Where a key moves the focus in the season strips: left and right within a row, Home and End to its ends, up and down
 * to the same position in the next row (or its last cell when that row is shorter). Undefined when the key doesn't
 * move it.
 */
export function roveCell({ key, row, index, lengths }: RoveCellParams): { row: number; index: number } | undefined {
  const last = (lengths.at(row) ?? 0) - 1;
  const vertical = key === 'ArrowDown' ? row + 1 : key === 'ArrowUp' ? row - 1 : undefined;

  if (vertical !== undefined) {
    const length = vertical >= 0 ? lengths.at(vertical) ?? 0 : 0;
    return length > 0 ? { row: vertical, index: Math.min(index, length - 1) } : undefined;
  }
  if (key === 'ArrowRight') return index < last ? { row, index: index + 1 } : undefined;
  if (key === 'ArrowLeft') return index > 0 ? { row, index: index - 1 } : undefined;
  if (key === 'Home') return { row, index: 0 };
  if (key === 'End') return { row, index: last };
  return undefined;
}
