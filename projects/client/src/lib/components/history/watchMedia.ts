import { z } from 'zod/v4';
import type { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import type { WatchEpisode } from './WatchEpisode.ts';
import type { HistoryPlay } from './HistoryPlay.ts';
import type { WatchTarget } from './WatchTarget.ts';

type Params = {
  target: WatchTarget;
  /** null removes every play; the API resolves now/released/unknown using account preferences. */
  watchedAt: string | null;
  force?: boolean;
  /** Remove this history row only; other plays stay watched. */
  play?: HistoryPlay;
  overlay: Pick<ReturnType<typeof createOverlay>, 'patch'>;
  request: (path: string, body?: unknown) => Promise<Response>;
  episodes: () => Promise<readonly WatchEpisode[]>;
  notify: { success: (message: string) => void; error: (message: string) => void };
  now?: () => Date;
};
const resultSchema = z.object({
  message: z.string().optional(),
  added: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
  deleted: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
  not_found: z.record(z.string(), z.array(z.unknown())).optional(),
});
const episodeSchema = z.array(z.object({
  show: z.object({ ids: z.object({ trakt: z.number() }) }),
  episode: z.object({ season: z.number(), number: z.number(), ids: z.object({ trakt: z.number() }) }),
}));

async function episodeContext({ target, request }: Params): Promise<WatchEpisode[]> {
  if (target.season?.episode !== undefined) {
    return [{
      id: target.id,
      show: target.season.show,
      season: target.season.number,
      number: target.season.episode,
      completed: false,
    }];
  }
  const response = await request(`/search/trakt/${target.id}?type=episode`);
  if (!response.ok) throw new Error(String(response.status));
  const row = episodeSchema.parse(await response.json()).at(0);
  if (!row) throw new Error('Episode not found');
  return [{
    id: target.id,
    show: row.show.ids.trakt,
    season: row.episode.season,
    number: row.episode.number,
    completed: false,
  }];
}

/** Remove one matching instant, retaining duplicate dates belonging to other history rows. */
function withoutPlay(dates: readonly string[], at: string): string[] {
  const index = dates.findIndex((date) => Date.parse(date) === Date.parse(at));
  return dates.filter((_, i) => i !== index);
}

/** Patches the shared history slice immediately before the write, and restores it on every failure. */
export async function watchMedia(params: Params): Promise<boolean> {
  const { target, watchedAt, force = false, play, overlay, request, notify, now = () => new Date() } = params;
  const remove = watchedAt === null;
  let rollback = () => {};
  try {
    const episodes = target.type === 'episode'
      ? await episodeContext(params)
      : target.type === 'movie' || remove
      ? []
      : (await params.episodes()).filter((episode) => force || !episode.completed);
    if (!remove && target.type !== 'movie' && episodes.length === 0) {
      notify.error('Doh! No aired episodes were found to watch.');
      return false;
    }
    const at = watchedAt === 'unknown'
      ? '1970-01-01T00:00:00.000Z'
      : watchedAt && !['now', 'released'].includes(watchedAt)
      ? watchedAt
      : now().toISOString();
    rollback = target.type === 'movie'
      ? overlay.patch('watchedMovies', (before) => {
        const after = new Map(before);
        if (remove && play) {
          const dates = withoutPlay(before.get(target.id) ?? [], play.watchedAt);
          if (dates.length > 0) after.set(target.id, dates);
          else after.delete(target.id);
        } else if (remove) after.delete(target.id);
        else after.set(target.id, [at, ...(before.get(target.id) ?? [])]);
        return after;
      }, play ? undefined : new Map())
      : overlay.patch('watchedShows', (before) => {
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
          if (remove && play) {
            const dates = withoutPlay(values.get(episode.id) ?? [], play.watchedAt);
            if (dates.length > 0) values.set(episode.id, dates);
            else values.delete(episode.id);
          } else if (remove) values.delete(episode.id);
          else values.set(episode.id, [at, ...(values.get(episode.id) ?? [])]);
          seasons.set(episode.season, values);
          after.set(episode.show, seasons);
        }
        return after;
      }, play ? undefined : new Map());
    const items = remove && play
      ? { ids: [play.id] }
      : target.type === 'movie' || remove
      ? { [`${target.type}s`]: [{ ids: { trakt: target.id }, ...(remove ? {} : { watched_at: watchedAt }) }] }
      : { episodes: episodes.map(({ id }) => ({ ids: { trakt: id }, watched_at: watchedAt })) };
    const response = await request(`/sync/history${remove ? '/remove' : ''}`, items);
    if (!response.ok) throw new Error(String(response.status));
    const result = resultSchema.parse(await response.json());
    if (Object.values(result.not_found ?? {}).some((items) => items.length > 0)) throw new Error('Item not found');
    if (play && (result.deleted?.movies ?? 0) + (result.deleted?.episodes ?? 0) === 0) {
      throw new Error('Play not removed');
    }
    notify.success(
      result.message ??
        (remove
          ? play ? `You removed this play of ${target.title}.` : `You removed all plays of ${target.title}.`
          : `You watched ${target.title}.`),
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
