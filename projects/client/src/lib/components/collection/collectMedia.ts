import { z } from 'zod/v4';
import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { WatchEpisode } from '../history/WatchEpisode.ts';
import type { WatchTarget } from '../history/WatchTarget.ts';
import type { CollectionMetadata } from './CollectionMetadata.ts';

type Params = {
  target: WatchTarget;
  collectedAt?: string | null;
  metadata?: CollectionMetadata;
  force?: boolean;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  request: (path: string, body?: unknown) => Promise<Response>;
  episodes: () => Promise<readonly WatchEpisode[]>;
  notify: { success: (message: string) => void; error: (message: string) => void };
  now?: () => Date;
};
const resultSchema = z.object({
  message: z.string().optional(),
  added: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
  updated: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
  deleted: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
}).refine((result) => Boolean(result.added || result.updated || result.deleted), 'Missing collection result counts');
const episodeSchema = z.array(z.object({
  show: z.object({ ids: z.object({ trakt: z.number() }) }),
  episode: z.object({ season: z.number(), number: z.number() }),
}));

/** Writes aired episodes only; metadata-only changes preserve collection dates and membership. */
export async function collectMedia(params: Params): Promise<boolean> {
  const { target, collectedAt, metadata, force = false, overlay, request, notify, now = () => new Date() } = params;
  const remove = collectedAt === null;
  const metadataOnly = collectedAt === undefined;
  let rollback = () => {};
  try {
    const context = target.type === 'episode' && target.season?.episode === undefined
      ? await request(`/search/trakt/${target.id}?type=episode`)
      : undefined;
    if (context && !context.ok) throw new Error(String(context.status));
    const row = context ? episodeSchema.parse(await context.json()).at(0) : undefined;
    if (target.type === 'episode' && !row && target.season?.episode === undefined) throw new Error('Episode not found');
    const episodes = target.type === 'episode' && target.season?.episode !== undefined
      ? [{
        id: target.id,
        show: target.season.show,
        season: target.season.number,
        number: target.season.episode,
        completed: false,
      }]
      : row
      ? [{
        id: target.id,
        show: row.show.ids.trakt,
        season: row.episode.season,
        number: row.episode.number,
        completed: false,
      }]
      : target.type === 'movie' || remove
      ? []
      : (await params.episodes()).filter((episode) => metadataOnly ? episode.completed : force || !episode.completed);
    if (!remove && target.type !== 'movie' && episodes.length === 0) {
      notify.error(
        metadataOnly ? 'No collected episodes were found to update.' : 'Doh! No aired episodes were found to collect.',
      );
      return false;
    }
    const at = collectedAt === 'unknown'
      ? '1970-01-01T00:00:00.000Z'
      : collectedAt && !['now', 'released'].includes(collectedAt)
      ? collectedAt
      : now().toISOString();
    const updated = (before: string | { at: string; metadata?: CollectionMetadata } | undefined, id?: number) => ({
      at: metadataOnly ? typeof before === 'string' ? before : before?.at ?? at : at,
      id,
      metadata: metadata ?? (typeof before === 'string' ? undefined : before?.metadata),
    });
    rollback = target.type === 'movie'
      ? overlay.patch('collectedMovies', (before) => {
        const after = new Map(before);
        if (remove) after.delete(target.id);
        else after.set(target.id, updated(before.get(target.id)));
        return after;
      }, new Map())
      : overlay.patch('collectedShows', (before) => {
        const after = new Map(before);
        if (remove && target.type === 'show') {
          after.delete(target.id);
          return after;
        }
        if (remove && target.type === 'season') {
          if (!target.season) throw new Error('Season context unavailable');
          const seasons = new Map(after.get(target.season.show));
          seasons.delete(target.season.number);
          after.set(target.season.show, seasons);
          return after;
        }
        for (const episode of episodes) {
          const seasons = new Map(after.get(episode.show));
          const values = new Map(seasons.get(episode.season));
          if (remove) values.delete(episode.number);
          else values.set(episode.number, updated(values.get(episode.number), episode.id));
          seasons.set(episode.season, values);
          after.set(episode.show, seasons);
        }
        return after;
      }, new Map());
    const fields = remove ? {} : { ...(metadataOnly ? {} : { collected_at: collectedAt }), ...metadata };
    const items = target.type === 'movie' || remove || target.type === 'episode'
      ? { [`${target.type}s`]: [{ ids: { trakt: target.id }, ...fields }] }
      : { episodes: episodes.map(({ id }) => ({ ids: { trakt: id }, ...fields })) };
    const response = await request(`/sync/collection${remove ? '/remove' : ''}`, items);
    if (!response.ok) throw new Error(String(response.status));
    const result = resultSchema.parse(await response.json());
    if (Object.values(result.not_found ?? {}).some((items) => items.length > 0)) throw new Error('Item not found');
    notify.success(
      result.message ??
        (remove
          ? `You removed ${target.title} from your library.`
          : metadataOnly
          ? 'Your collection metadata was saved.'
          : `You added ${target.title} to your library.`),
    );
    return true;
  } catch (error) {
    rollback();
    if (remove || !(error instanceof Error) || error.message !== '429') {
      notify.error('Doh! We ran into some sort of error.');
    }
    return false;
  }
}
