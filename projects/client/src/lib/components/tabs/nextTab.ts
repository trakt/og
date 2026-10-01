const MOVES: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

/**
 * The tab an ARIA tablist key moves to: the arrows wrap around, Home and End jump to the ends. `undefined` for any
 * other key, or an empty list, so the tablist leaves the event alone.
 */
export function nextTab(ids: readonly string[], selected: string | undefined, key: string): string | undefined {
  const move = MOVES[key];
  if (!move || ids.length === 0) return undefined;

  const index = Math.max(ids.findIndex((id) => id === selected), 0);
  return ids.at(move(index, ids.length));
}
