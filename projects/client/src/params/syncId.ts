/** A data sync's numeric id, as `/settings/syncs/:id` takes it. */
export function match(param: string): boolean {
  return /^\d+$/.test(param);
}
