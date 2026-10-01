import { error } from '@sveltejs/kit';
import { ratingsResponseSchema } from '@trakt/api';
import { api } from '../api/api.ts';
import { contractSchema } from '../api/contractSchema.ts';
import { loadSubpageMedia } from '../subpage/loadSubpageMedia.ts';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { mediaStatsSchema } from './mediaStatsSchema.ts';
import { toMediaStats } from './toMediaStats.ts';

type Params = Omit<Parameters<typeof loadSubpageMedia>[0], 'suffix' | 'neighbours'>;

function body<T>(
  response: { status: number; body: unknown },
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  label: string,
): T {
  if (response.status !== 200) error(502, `The Trakt API could not load the ${label}.`);
  const result = contractSchema(schema).safeParse(response.body);
  if (!result.success) error(502, `The Trakt API returned invalid ${label} data.`);
  return result.data;
}

function number(value: string, name: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) error(404, `${name} not found`);
  return Number(value);
}

async function readStats(fetch: typeof globalThis.fetch, item: SubpageItem) {
  const client = api({ fetch });
  const { id } = item;
  if (item.type === 'movie' || item.type === 'show') {
    const requests = item.type === 'movie' ? client.movies : client.shows;
    const [ratings, stats] = await Promise.all([
      requests.ratings({ params: { id }, query: { extended: 'all' } }),
      requests.stats({ params: { id } }),
    ]);
    return {
      ratings,
      stats,
    };
  }
  const season = number(item.season, 'Season');
  const [ratings, stats] = item.type === 'season'
    ? await Promise.all([
      client.shows.season.ratings({ params: { id, season }, query: {} }),
      client.shows.season.stats({ params: { id, season } }),
    ])
    : await Promise.all([
      client.shows.episode.ratings({
        params: { id, season, episode: number(item.episode, 'Episode') },
        query: { extended: 'all' },
      }),
      client.shows.episode.stats({ params: { id, season, episode: number(item.episode, 'Episode') } }),
    ]);
  return { ratings, stats };
}

/** Public ratings and stats start beside the shared media and layout reads; viewer writes stay in MediaRating. */
export async function loadStats({ fetch, parent, item }: Params) {
  const [subpage, reads] = await Promise.all([
    loadSubpageMedia({ fetch, parent, item, suffix: 'stats', neighbours: false }),
    readStats(fetch, item),
  ]);
  return {
    ...subpage,
    stats: toMediaStats({
      media: subpage.media,
      // Validate auxiliaries only after the media read has handled a missing item or canonical redirect.
      ratings: body(reads.ratings, ratingsResponseSchema, 'ratings'),
      stats: body(reads.stats, mediaStatsSchema, 'stats'),
      rank: subpage.streamingRank,
      country: subpage.settings?.browsing?.watchnow?.country?.toLowerCase() || 'us',
      otherSiteRatings: subpage.settings?.browsing?.other_site_ratings ?? true,
      earlyRatings: subpage.settings?.browsing?.display_early_ratings ?? false,
      now: new Date(),
    }),
  };
}
