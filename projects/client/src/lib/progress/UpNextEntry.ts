import type { UpNextResponse } from '@trakt/api';

/**
 * An up-next entry as the worker sends it. @trakt/api types `progress.reset_at` as always null, but the worker sends
 * the rewatch start date while the show is being rewatched.
 */
export type UpNextEntry = Omit<UpNextResponse, 'progress'> & {
  readonly progress: Omit<UpNextResponse['progress'], 'reset_at'> & { readonly reset_at?: string | null };
};
