type RowCountParams = {
  /** The saved or requested rows. Left out, one row, OG's default. */
  rows?: number | null;
  items: number;
  perRow?: number;
  /** OG's dashboard panels stop at three rows. */
  maxRows?: number;
};

/** How many rows a dashboard panel shows: between one and as many as its items fill, at most `maxRows`. */
export function rowCount({ rows, items, perRow = 6, maxRows = 3 }: RowCountParams): { rows: number; maxRows: number } {
  const filled = Math.min(Math.max(Math.ceil(items / perRow), 1), maxRows);
  const wanted = typeof rows === 'number' && Number.isInteger(rows) ? rows : 1;

  return { rows: Math.min(Math.max(wanted, 1), filled), maxRows: filled };
}
