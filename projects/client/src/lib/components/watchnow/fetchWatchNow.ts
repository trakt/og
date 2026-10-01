import type { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';

type FetchWatchNowParams<T extends z.ZodType> = {
  /** SSR passes the load's; the browser uses its own. */
  fetch?: typeof globalThis.fetch;
  path: string;
  schema: T;
};

/**
 * One watch-now read, parsed at the boundary. Every watch-now route is Official-gated and public, so none sends the
 * token. A failed, unreadable or malformed response is `null`, which the block and the modal show as no offers.
 */
export async function fetchWatchNow<T extends z.ZodType>(
  { fetch, path, schema }: FetchWatchNowParams<T>,
): Promise<z.output<T> | null> {
  const response = await rawApiFetch({ fetch, path }).catch(() => null);
  if (!response?.ok) return null;

  const parsed = schema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}
