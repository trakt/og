import { z } from 'zod/v4';
import type { DashboardSettings } from './DashboardSettings.ts';
import { type DashboardPrefs, dashboardPrefs } from './dashboardPrefs.ts';
import { upNextSorts } from './upNextSorts.ts';

// `/users/settings` is API, so only the fields the dashboard reads are parsed, each on its own.
const schema = z.object({
  user: z.object({ vip: z.boolean().nullish().catch(null), joined_at: z.string().nullish().catch(null) }).nullish()
    .catch(null),
  browsing: z.object({
    progress: z.object({
      on_deck: z.object({
        sort: z.string().nullish().catch(null),
        sort_how: z.enum(['asc', 'desc']).nullish().catch(null),
        refresh: z.boolean().nullish().catch(null),
        simple_progress: z.boolean().nullish().catch(null),
        only_favorites: z.boolean().nullish().catch(null),
      }).nullish().catch(null),
    }).nullish().catch(null),
    watchnow: z.object({ favorites: z.array(z.string()).nullish().catch(null) }).nullish().catch(null),
    recommendations: z.object({
      ignore_collected: z.boolean().nullish().catch(null),
      ignore_watchlisted: z.boolean().nullish().catch(null),
    }).nullish().catch(null),
  }).nullish().catch(null),
});

type ToDashboardSettingsParams = {
  /** The layout's `/users/settings`, or null signed out. */
  settings: unknown;
  prefs?: DashboardPrefs;
};

/** OG's `TRAKT_VIP_GRANDFATHER_DATES['2024-09']`: members who joined before it keep the VIP section switches. */
const GRANDFATHERED_BEFORE = '2024-09-11';

// The progress service treats the form's `activity` default as `added`.
function upNextSort(sort: string | null | undefined, how: 'asc' | 'desc' | null | undefined) {
  const by = sort === 'activity' ? 'added' : sort;
  const found = upNextSorts.find((option) => option.by === by) ?? upNextSorts[0];
  return { by: found.by, how: how ?? 'asc', title: found.title } as const;
}

/**
 * The dashboard's settings from `/users/settings` and the per-browser prefs, with OG's defaults for
 * anything unset. As in OG, hiding Up Next and Recently Watched works for
 * everyone, and the other section switches only for VIPs and members who joined before September 11, 2024.
 */
export function toDashboardSettings(
  { settings, prefs = dashboardPrefs.defaults }: ToDashboardSettingsParams,
): DashboardSettings {
  const parsed = schema.safeParse(settings ?? {});
  const { user, browsing } = parsed.success ? parsed.data : {};
  const onDeck = browsing?.progress?.on_deck;
  const favorites = onDeck?.only_favorites ? browsing?.watchnow?.favorites?.length ?? 0 : 0;
  const grandfathered = user?.vip === true || (user?.joined_at?.slice(0, 10) ?? '9999') < GRANDFATHERED_BEFORE;
  const vipHidden = (hidden: boolean) => grandfathered && hidden;

  return {
    upNext: {
      sort: upNextSort(onDeck?.sort, onDeck?.sort_how),
      favorites,
      simpleProgress: onDeck?.simple_progress === true,
      refresh: onDeck?.refresh === true,
      poster: prefs.on_deck_poster,
    },
    schedule: { filter: prefs.upcoming_filter, startDay: prefs.upcoming_start_day, poster: prefs.upcoming_poster },
    recommendations: {
      ignoreCollected: browsing?.recommendations?.ignore_collected === true,
      ignoreWatchlisted: browsing?.recommendations?.ignore_watchlisted === true,
    },
    hidden: {
      upNext: prefs.hide_on_deck,
      schedule: vipHidden(prefs.hide_upcoming),
      watchlist: vipHidden(prefs.hide_list),
      lastThirtyDays: vipHidden(prefs.hide_stats),
      recentlyWatched: prefs.hide_recently_watched,
      socialFeed: vipHidden(prefs.hide_network),
      recommendations: vipHidden(prefs.hide_recommendations),
    },
  };
}
