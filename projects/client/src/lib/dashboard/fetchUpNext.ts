import type { api } from '../api/api.ts';
import type { OnDeckItem } from '../components/media/OnDeckItem.ts';
import { toOnDeckItem } from '../progress/toOnDeckItem.ts';
import type { UpNextEntry } from '../progress/UpNextEntry.ts';
import type { DashboardSettings } from './DashboardSettings.ts';
import { fetchSeasonPosters } from './fetchSeasonPosters.ts';
import { sortUpNext } from './sortUpNext.ts';
import { toDashboardSettings } from './toDashboardSettings.ts';
import { upNextSorts } from './upNextSorts.ts';

type Client = ReturnType<typeof api>;

type FetchUpNextParams = {
  api: Client;
  /** The viewer's slug, for the progress links. */
  username: string;
  /** The viewer's Up Next settings. Left out, OG's defaults. */
  settings?: DashboardSettings['upNext'];
  /** For the public season posters, which go without the token. Left out, the global fetch. */
  fetch?: typeof globalThis.fetch;
};

type Query = { sort_by: string; sort_how: 'asc' | 'desc'; limit: number; watchnow?: string };

/** OG's dashboard shows up to three rows of six. */
const LIMIT = 18;
/**
 * The sorts og applies itself read the worker's default page instead, so the order is exact for anyone with up to 100
 * shows in progress.
 */
const SORTED_LIMIT = 100;

const flip = (how: 'asc' | 'desc') => (how === 'asc' ? 'desc' : 'asc');

function request({ sort, favorites }: DashboardSettings['upNext']): { query: Query; sorted: boolean } {
  const option = upNextSorts.find(({ by }) => by === sort.by);
  const worker = option && 'worker' in option ? option.worker : undefined;
  const order = worker
    ? { sort_by: worker.by, sort_how: worker.invert ? flip(sort.how) : sort.how }
    : { sort_by: 'default', sort_how: 'desc' as const };

  return {
    query: { ...order, limit: worker ? LIMIT : SORTED_LIMIT, ...(favorites > 0 && { watchnow: 'favorites' }) },
    sorted: !worker,
  };
}

async function upNext(client: Client, query: Query, lifetime: boolean): Promise<readonly UpNextEntry[]> {
  // @trakt/api 0.6.0's up_next contract lacks `watchnow`, which the worker's `sources` reads. The client sends
  // every query key it's given.
  const params = { extended: 'full,images' as const, ...query, ...(lifetime && { lifetime_stats: true }) };
  const response = await client.sync.progress.upNext.standard({ query: params });
  if (response.status !== 200) throw new Error(`Up Next failed with ${response.status}`);

  return response.body;
}

/**
 * OG's exact progress bar has a tick per aired episode, filled when watched, which only a show's own progress has.
 * A rewatch counts only the current run, which that doesn't say, so it keeps the plain bar. A failure does too.
 */
export async function fetchUpNextTicks(client: Client, entry: UpNextEntry): Promise<readonly boolean[] | undefined> {
  if (entry.progress.reset_at) return undefined;

  const response = await client.shows.progress.watched({ params: { id: String(entry.show.ids.trakt) }, query: {} })
    .catch(() => null);
  if (response?.status !== 200) return undefined;

  return response.body.seasons.flatMap((season) => season.episodes.map(({ completed }) => completed));
}

/**
 * The viewer's Up Next cards in their saved sort. The endpoint always answers for the token's owner. With
 * "only favorites", only shows streaming on their favorite services. A rewatch needs the whole show's progress too, so
 * only then does a second request fetch it with `lifetime_stats`. OG's exact progress bars need each show's progress,
 * and the season poster setting each show's seasons; those requests run only with those settings.
 */
export async function fetchUpNext(
  { api: client, username, settings = toDashboardSettings({ settings: null }).upNext, fetch = globalThis.fetch }:
    FetchUpNextParams,
): Promise<readonly OnDeckItem[]> {
  const { query, sorted } = request(settings);
  const fetched = (await upNext(client, query, false)).filter((entry) => entry.progress.next_episode);
  const entries = (sorted ? sortUpNext({ entries: fetched, ...settings.sort }) : fetched).slice(0, LIMIT);
  const rewatching = entries.some((entry) => entry.progress.reset_at);
  const episodes = entries.flatMap(({ show, progress }) =>
    progress.next_episode ? [{ showId: show.ids.trakt, season: progress.next_episode.season }] : []
  );

  const [lifetime, posterFor, showTicks] = await Promise.all([
    rewatching ? upNext(client, query, true).catch(() => []) : [],
    settings.poster === 'season' ? fetchSeasonPosters({ fetch, episodes }) : undefined,
    settings.simpleProgress ? [] : Promise.all(entries.map((entry) => fetchUpNextTicks(client, entry))),
  ]);
  const lifetimeById = new Map(lifetime.map((entry) => [entry.show.ids.trakt, entry]));

  return entries.flatMap((entry, i) => {
    const season = entry.progress.next_episode?.season;
    const item = toOnDeckItem({
      entry,
      lifetime: lifetimeById.get(entry.show.ids.trakt),
      username,
      seasonPoster: season === undefined ? undefined : posterFor?.(entry.show.ids.trakt, season),
      ticks: showTicks.at(i),
    });
    return item ? [item] : [];
  });
}
