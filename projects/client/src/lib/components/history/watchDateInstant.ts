import { watchDateInput } from './watchDateInput.ts';

/** Resolve the account wall clock to UTC. Reject impossible dates and DST gaps instead of shifting them. */
export function watchDateInstant(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const wall = Date.parse(`${value}Z`);
  if (!Number.isFinite(wall)) return null;
  const offset = (at: number) => Date.parse(`${watchDateInput(new Date(at), timeZone)}Z`) - at;
  const guess = wall - offset(wall);
  const resolved = new Date(wall - offset(guess));
  return watchDateInput(resolved, timeZone) === value ? resolved.toISOString() : null;
}
