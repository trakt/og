import { z } from 'zod/v4';

const resultSchema = z.object({ updated: z.number().int().nonnegative(), skipped_ids: z.array(z.number()) });

/** The page patches its order before this write and restores it when this returns false. No media slice changes. */
export async function saveListOrder({ rank, request, notify }: {
  rank: readonly number[];
  request: (path: string, body: unknown) => Promise<Response>;
  notify: { error: (message: string) => void };
}): Promise<boolean> {
  try {
    const response = await request('/users/me/lists/reorder', { rank });
    if (!response.ok) throw new Error(String(response.status));
    const result = resultSchema.parse(await response.json());
    if (result.skipped_ids.length > 0 || result.updated !== rank.length) throw new Error('Incomplete reorder');
    return true;
  } catch {
    notify.error(
      'Doh! We ran into an error. Please try signing out of Trakt, clear your browser cache, and sign back in.',
    );
    return false;
  }
}
