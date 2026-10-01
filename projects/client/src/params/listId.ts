/** A list's numeric trakt id, as `/lists/:id`, `/watchlist/:id` and `/officiallist/:id` take it. */
export function match(param: string): boolean {
  return /^\d+$/.test(param);
}
