import { z } from 'zod';
import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { RatingTarget } from './RatingTarget.ts';

type Request = (path: string, body?: unknown) => Promise<Response>;
type Params = {
  target: RatingTarget;
  rating: number | null;
  watchAfterRating?: string | null;
  overlay: Pick<ReturnType<typeof createOverlay>, 'state' | 'patch'>;
  request: Request;
  notify: { success: (message: string) => void; error: (message: string) => void };
  now?: () => Date;
};

const syncResult = z.object({
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
});
const episodeResult = z.array(z.object({
  episode: z.object({ season: z.number() }),
  show: z.object({ ids: z.object({ trakt: z.number() }) }),
}));

async function write(request: Request, path: string, body: unknown) {
  const response = await request(path, body);
  if (!response.ok) throw new Error(String(response.status));
  const result = syncResult.parse(await response.json());
  if (Object.values(result.not_found ?? {}).some((items) => items.length > 0)) throw new Error('Item not found');
}

async function autoWatch({ target, watchAfterRating, overlay, request, notify, now = () => new Date() }: Params) {
  if (target.type !== 'movie' && target.type !== 'episode') return;
  if (!['now', 'released', 'unknown'].includes(watchAfterRating ?? '')) return;
  const watched = overlay.state(target.type, target.id).watched;
  if (watched) return;

  // When the cache is unavailable, verify history before adding a play. Unknown never means unwatched.
  if (watched === undefined) {
    const history = await request(`/sync/history/${target.type}s/${target.id}?limit=1`);
    if (!history.ok) throw new Error('History unavailable');
    if (z.array(z.unknown()).parse(await history.json()).length > 0) return;
  }

  const at = watchAfterRating === 'unknown' ? '1970-01-01T00:00:00.000Z' : now().toISOString();
  const episode = target.type === 'episode'
    ? await request(`/search/trakt/${target.id}?type=episode&extended=full`).then(async (response) => {
      if (!response.ok) throw new Error('Episode unavailable');
      const row = episodeResult.parse(await response.json()).at(0);
      if (!row) throw new Error('Episode not found');
      return row;
    })
    : null;
  const rollback = episode
    ? overlay.patch('watchedShows', (shows) => {
      const seasons = new Map(shows.get(episode.show.ids.trakt));
      seasons.set(episode.episode.season, new Map(seasons.get(episode.episode.season)).set(target.id, [at]));
      return new Map(shows).set(episode.show.ids.trakt, seasons);
    })
    : overlay.patch('watchedMovies', (movies) => new Map(movies).set(target.id, [at]));
  try {
    // API resolves these values using the account timezone and release-date runtime preference.
    await write(request, '/sync/history', {
      [`${target.type}s`]: [{ ids: { trakt: target.id }, watched_at: watchAfterRating }],
    });
    notify.success(`You added ${target.title} to your watched history.`);
  } catch (error) {
    rollback();
    throw error;
  }
}

/** Rating and history are separate writes: a failed auto-watch never undoes a successfully saved rating. */
export async function rateMedia(params: Params): Promise<boolean> {
  const { target, rating, overlay, request, notify } = params;
  const rollback = overlay.patch('ratings', (ratings) => {
    const values = new Map(ratings[target.type]);
    if (rating === null) values.delete(target.id);
    else values.set(target.id, rating);
    return { ...ratings, [target.type]: values };
  }, { movie: new Map(), show: new Map(), season: new Map(), episode: new Map() });

  try {
    await write(request, `/sync/ratings${rating === null ? '/remove' : ''}`, {
      [`${target.type}s`]: [{ ids: { trakt: target.id }, ...(rating === null ? {} : { rating }) }],
    });
  } catch (error) {
    rollback();
    if (!(error instanceof Error) || error.message !== '429') notify.error("Doh! You can't rate this item.");
    return false;
  }
  notify.success(
    rating === null ? `You removed your rating for ${target.title}.` : `You rated ${target.title} ${rating} out of 10.`,
  );
  if (rating === null) return true;
  await autoWatch(params).catch(() =>
    notify.error('Your rating was saved, but we could not add this item to your watched history.')
  );
  return true;
}
