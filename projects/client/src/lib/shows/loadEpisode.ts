import { error, redirect } from '@sveltejs/kit';
import {
  episodeResponseSchema,
  episodeStatsResponseSchema,
  ratingsResponseSchema,
  seasonResponseSchema,
  showResponseSchema,
  videoResponseSchema,
} from '@trakt/api';
import { api } from '../api/api.ts';
import { contractSchema } from '../api/contractSchema.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { episodePeopleSchema } from './episodePeopleSchema.ts';
import { episodeSeasonsSchema } from './episodeSeasonsSchema.ts';
import { seasonPeopleSchema } from './seasonPeopleSchema.ts';
import { toEpisodeSummary } from './toEpisodeSummary.ts';

interface Params {
  fetch: typeof fetch;
  id: string;
  season: string;
  episode: string;
  url: URL;
  parent: () => Promise<{ user: HeaderUser | null; settings: ViewerSettings | null; datePreferences: DatePreferences }>;
}
function number(value: string, label: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) error(404, `${label} not found`);
  return Number(value);
}
function body<T>(
  response: { status: number; body: unknown; headers: Headers },
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  label: string,
): T {
  if (response.status === 404 && ['Show', 'Season', 'Episode'].includes(label)) error(404, `${label} not found`);
  if (response.status !== 200) error(502, `The Trakt API could not load the ${label.toLowerCase()}.`);
  const parsed = contractSchema(schema).safeParse(response.body);
  if (!parsed.success) error(502, `The Trakt API returned invalid ${label.toLowerCase()} data.`);
  return parsed.data;
}
async function parsed<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  label: string,
): Promise<T> {
  if (!response.ok) error(502, `The Trakt API could not load the ${label}.`);
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success || result.data === undefined) error(502, `The Trakt API returned invalid ${label} data.`);
  return result.data;
}

/** All public reads and the parent start together, without the viewer's cookie token. */
export async function loadEpisode(
  { fetch, parent, id, season: requestedSeason, episode: requestedEpisode, url }: Params,
) {
  const season = number(requestedSeason, 'Season');
  const episode = number(requestedEpisode, 'Episode');
  const client = api({ fetch });
  const params = { id, season, episode };
  const path = `/shows/${encodeURIComponent(id)}/seasons/${season}`;
  const [
    showResponse,
    episodeResponse,
    seasonResponse,
    episodesResponse,
    seasonsResponse,
    peopleResponse,
    regularsResponse,
    ratingsResponse,
    statsResponse,
    videosResponse,
    layout,
  ] = await Promise.all([
    client.shows.summary({ params: { id }, query: { extended: 'full,images' } }),
    client.shows.episode.summary({ params, query: { extended: 'full,images' } }),
    client.shows.season.info({ params: { id, season }, query: { extended: 'full,images' } }),
    client.shows.season.episodes({ params: { id, season }, query: { extended: 'full,images' } }),
    rawApiFetch({ fetch, path: `/shows/${encodeURIComponent(id)}/seasons?extended=episodes` }),
    rawApiFetch({ fetch, path: `${path}/episodes/${episode}/people?extended=guest_stars,images` }),
    rawApiFetch({ fetch, path: `${path}/people?extended=images` }),
    client.shows.episode.ratings({ params, query: { extended: 'all' } }),
    client.shows.episode.stats({ params }),
    client.shows.episode.videos({ params }),
    parent(),
  ]);
  const show = body(showResponse, showResponseSchema, 'Show');
  const info = body(episodeResponse, episodeResponseSchema, 'Episode');
  if (id !== show.ids.slug || requestedSeason !== `${season}` || requestedEpisode !== `${episode}`) {
    redirect(301, `/shows/${show.ids.slug}/seasons/${season}/episodes/${episode}${url.search}`);
  }
  const [seasons, people, regulars] = await Promise.all([
    parsed(seasonsResponse, episodeSeasonsSchema, 'seasons'),
    parsed(peopleResponse, episodePeopleSchema, 'episode cast'),
    parsed(regularsResponse, seasonPeopleSchema, 'season cast'),
  ]);
  const view = toEpisodeSummary({
    show,
    episode: info,
    season: body(seasonResponse, seasonResponseSchema, 'Season'),
    episodes: body(episodesResponse, episodeResponseSchema.array(), 'Episodes'),
    seasons,
    people,
    regulars,
    ratings: body(ratingsResponse, ratingsResponseSchema, 'Ratings'),
    stats: body(statsResponse, episodeStatsResponseSchema, 'Stats'),
    videos: body(videosResponse, videoResponseSchema.array(), 'Videos'),
    datePreferences: layout.datePreferences,
    now: new Date(),
    isVip: layout.user?.isVip ?? false,
    episodeTypeTags: !layout.settings?.browsing?.hide_episode_type_tags,
    earlyRatings: layout.settings?.browsing?.display_early_ratings ?? false,
    otherSiteRatings: layout.settings?.browsing?.other_site_ratings ?? true,
  });
  return {
    episode: view,
    user: layout.user,
    datePreferences: layout.datePreferences,
  };
}
