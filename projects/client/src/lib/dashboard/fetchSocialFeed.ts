import { z } from 'zod/v4';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { type SocialActivity, socialActivitySchema } from './socialActivitySchema.ts';
import { type SocialPlay, toSocialPlay } from './toSocialPlay.ts';

type FetchSocialFeedParams = {
  fetch: typeof globalThis.fetch;
  token: string;
  /** How many members the viewer follows (`fetchFollowingCount`). Null when that didn't load. */
  following: Promise<number | null>;
  now: Date;
  datePreferences: DatePreferences;
};

/** OG's dashboard showed 12 plays from the last seven days. */
const LIMIT = 12;
const DAYS = 7;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const rowsSchema = z.array(z.unknown());

type WindowParams = Omit<FetchSocialFeedParams, 'following' | 'datePreferences'> & { day: number };

/** One day of watches, the most the worker serves at once (`toFollowingActivityWindow.ts`), newest first. */
async function fetchDay({ fetch, token, now, day }: WindowParams): Promise<readonly SocialActivity[]> {
  // Minute boundaries, so the same page load asks for the same windows and the worker's cache can answer.
  const end = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS - day * DAY_MS;
  const search = new URLSearchParams({
    action: 'watch',
    start_at: new Date(end - DAY_MS).toISOString(),
    end_at: new Date(end).toISOString(),
    limit: `${LIMIT}`,
    extended: 'full,images',
  });
  const response = await rawApiFetch({ fetch, token, path: `/v3/users/me/following/activities?${search}` });
  if (response.status !== 200) throw new Error(`The Social Feed failed with ${response.status}`);

  const rows = rowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) throw new Error('The Social Feed returned an invalid feed');

  // A row this panel can't show (a watch with no media) is skipped rather than failing the others.
  return rows.data.flatMap((row) => {
    const activity = socialActivitySchema.safeParse(row);
    return activity.success ? [activity.data] : [];
  });
}

/** Walks back a day at a time until 12 plays turn up or the week runs out. */
async function collect(params: WindowParams, found: readonly SocialActivity[]): Promise<readonly SocialActivity[]> {
  if (found.length >= LIMIT || params.day >= DAYS) return found;

  // Once some plays are in, a day that fails ends the walk instead of losing them.
  const day = await fetchDay(params).catch((error) => {
    if (found.length === 0) throw error;
    return null;
  });
  if (!day) return found;

  // Both ends of a window are inclusive, so a play on the boundary can come back twice.
  const fresh = day.filter((activity) => !found.some(({ id }) => id === activity.id));
  return collect({ ...params, day: params.day + 1 }, [...found, ...fresh]);
}

/**
 * The Social Feed: up to 12 plays by the people the viewer follows over the last seven days, newest first, from
 * the worker's v3 feed. That feed serves 24 hours at a time and falls back to the Trakt team's plays when you follow
 * nobody, so a viewer who follows nobody gets OG's empty panel without asking.
 */
export async function fetchSocialFeed(
  { fetch, token, following, now, datePreferences }: FetchSocialFeedParams,
): Promise<readonly SocialPlay[]> {
  if ((await following) === 0) return [];

  const activities = await collect({ fetch, token, now, day: 0 }, []);
  return activities.slice(0, LIMIT).map((activity) => toSocialPlay(activity, datePreferences));
}
