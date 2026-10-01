import { api } from '../../../lib/api/api.ts';
import { dashboardPrefs } from '../../../lib/dashboard/dashboardPrefs.ts';
import { fetchFollowingCount } from '../../../lib/dashboard/fetchFollowingCount.ts';
import { fetchLastThirtyDays } from '../../../lib/dashboard/fetchLastThirtyDays.ts';
import { fetchRecommendations } from '../../../lib/dashboard/fetchRecommendations.ts';
import { fetchRecentlyWatched } from '../../../lib/dashboard/fetchRecentlyWatched.ts';
import { fetchSchedule } from '../../../lib/dashboard/fetchSchedule.ts';
import { fetchSocialFeed } from '../../../lib/dashboard/fetchSocialFeed.ts';
import { fetchUpNext } from '../../../lib/dashboard/fetchUpNext.ts';
import { fetchWatchlist } from '../../../lib/dashboard/fetchWatchlist.ts';
import { toDashboardSettings } from '../../../lib/dashboard/toDashboardSettings.ts';

/**
 * Signed in, the live panels stream the viewer's real Up Next, Upcoming Schedule, Watchlist, Last 30 Days, Recently
 * Watched, Social Feed and recommendations, honoring their dashboard settings (`/users/settings` and the per-browser
 * `og-dashboard` cookie). The sample panels below them don't need a session. Until the dashboard frame lands,
 * this is where the panels render with real data.
 */
export async function load({ fetch, locals, parent, cookies }) {
  const { user, settings, datePreferences } = await parent();
  if (!locals.token || !user) {
    return {
      viewer: null,
      dashboard: null,
      upNext: null,
      schedule: null,
      watchlist: null,
      lastThirtyDays: null,
      recentlyWatched: null,
      socialFeed: null,
      recommendations: null,
    };
  }

  const { token } = locals;
  const client = api({ fetch, token });
  const now = new Date();
  const dashboard = toDashboardSettings({
    settings,
    prefs: dashboardPrefs.read(cookies.get(dashboardPrefs.COOKIE), user.slug),
  });
  // Both panels read it: the Social Feed skips its request at zero, and the recommendations name the count.
  const following = fetchFollowingCount({ api: client });
  // A hidden panel isn't fetched at all, and comes back null like a signed-out one.
  const { hidden } = dashboard;
  const unless = <T>(hide: boolean, load: () => Promise<T>) => (hide ? null : load());

  return {
    viewer: { username: user.slug, isVip: user.isVip },
    dashboard,
    upNext: unless(
      hidden.upNext,
      () => fetchUpNext({ api: client, username: user.slug, settings: dashboard.upNext, fetch }),
    ),
    schedule: unless(hidden.schedule, () =>
      fetchSchedule({
        fetch,
        token: token,
        settings,
        datePreferences,
        isVip: user.isVip,
        schedule: dashboard.schedule,
      })),
    watchlist: unless(hidden.watchlist, () => fetchWatchlist({ fetch, token: token, datePreferences })),
    lastThirtyDays: unless(hidden.lastThirtyDays, () =>
      fetchLastThirtyDays({
        fetch,
        token: token,
        slug: user.slug,
        timeZone: datePreferences.timeZone,
      })),
    recentlyWatched: unless(
      hidden.recentlyWatched,
      () => fetchRecentlyWatched({ fetch, token: token, datePreferences }),
    ),
    socialFeed: unless(
      hidden.socialFeed,
      () => fetchSocialFeed({ fetch, token: token, following, now, datePreferences }),
    ),
    recommendations: unless(hidden.recommendations, () =>
      fetchRecommendations({
        api: client,
        following,
        now,
        order: datePreferences.order,
        ignore: dashboard.recommendations,
      })),
  };
}
