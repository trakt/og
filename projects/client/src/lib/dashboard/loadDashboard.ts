import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { toProfileUser } from '../users/toProfileUser.ts';
import { toWatchingNow } from '../users/toWatchingNow.ts';
import { formatDate } from '../utils/formatDate.ts';
import { dashboardNotices } from './dashboardNotices.ts';
import { dashboardPrefs } from './dashboardPrefs.ts';
import { dashboardProfileSchema } from './dashboardProfileSchema.ts';
import { fetchLastThirtyDays } from './fetchLastThirtyDays.ts';
import { fetchRecentlyWatched } from './fetchRecentlyWatched.ts';
import { fetchRecommendations } from './fetchRecommendations.ts';
import { fetchSchedule } from './fetchSchedule.ts';
import { fetchSocialFeed } from './fetchSocialFeed.ts';
import { fetchUpNext } from './fetchUpNext.ts';
import { fetchWatchlist } from './fetchWatchlist.ts';
import { followRequestsSchema } from './followRequestsSchema.ts';
import { toDashboardSettings } from './toDashboardSettings.ts';
import { toFollowRequest } from './toFollowRequest.ts';

type Params = {
  fetch: typeof fetch;
  /** Streamed panels use a fetch without SvelteKit's completed-load dependency tracker. */
  panelFetch?: typeof fetch;
  locals: { token: string | null };
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{ user: HeaderUser | null; settings: ViewerSettings | null; datePreferences: DatePreferences }>;
  now?: Date;
};

// A hidden panel isn't fetched at all, and the page leaves it out.
const unless = <T>(hidden: boolean, load: () => Promise<T>) => (hidden ? null : load());

/**
 * The dashboard frame loads alongside layout settings; the panels stream and fail independently, in the viewer's
 * dashboard settings: `/users/settings` and the per-browser `og-dashboard` cookie.
 */
export async function loadDashboard({ fetch, panelFetch = fetch, locals, cookies, parent, now = new Date() }: Params) {
  const { token } = locals;
  if (!token) redirect(302, '/');
  const client = api({ fetch, token });
  const [profile, stats, watching, requests, layout] = await Promise.all([
    client.users.profile({ params: { id: 'me' }, query: { extended: 'full,vip' } }),
    client.users.stats({ params: { id: 'me' } }),
    client.users.watching({ params: { id: 'me' }, query: { extended: 'full,images' } }),
    client.users.requests.follow({ query: { extended: 'full' } }),
    parent(),
  ]);
  // A stale cookie renders logged-out. The browser owns renewal; no isolate refreshes the token.
  if ([profile, stats, watching, requests].some(({ status }) => status === 401) || !layout.user) redirect(302, '/');
  if (
    profile.status !== 200 || stats.status !== 200 || requests.status !== 200 ||
    ![200, 204].includes(watching.status)
  ) error(502, 'Trakt is having trouble loading your dashboard.');
  const parsedProfile = dashboardProfileSchema.safeParse(profile.body);
  const parsedRequests = followRequestsSchema.safeParse(requests.body);
  if (!parsedProfile.success || !parsedRequests.success) error(502, 'Trakt returned an invalid dashboard response.');
  const user = toProfileUser(parsedProfile.data);
  const dashboard = toDashboardSettings({
    settings: layout.settings,
    prefs: dashboardPrefs.read(cookies.get(dashboardPrefs.COOKIE), user.slug),
  });
  const { hidden } = dashboard;
  const panelClient = api({ fetch: panelFetch, token });
  // The Social Feed skips its request at zero, and the recommendations name the count: the stats strip's read has it.
  const following = Promise.resolve(stats.body.network?.following ?? null);
  const notices = dashboardNotices({
    joinedAt: parsedProfile.data.joined_at,
    now,
    isVip: !!user.vip,
    listLimit: layout.settings?.limits?.list.count,
  });
  return {
    profile: user,
    memberSince: formatDate(parsedProfile.data.joined_at, { ...layout.datePreferences, time: true }),
    stats: stats.body,
    watching: watching.status === 200 ? toWatchingNow(watching.body) : null,
    requests: parsedRequests.data.map((row) => toFollowRequest(row, layout.datePreferences)),
    notices: {
      ...notices,
      welcome: notices.welcome && cookies.get('og-dashboard-welcome-hidden') !== '1',
      anniversary: cookies.get('og-dashboard-anniversary-hidden') === now.toISOString().slice(0, 10)
        ? null
        : notices.anniversary,
    },
    noticeDay: now.toISOString().slice(0, 10),
    dashboard,
    upNext: unless(
      hidden.upNext,
      () => fetchUpNext({ api: panelClient, username: user.slug, settings: dashboard.upNext, fetch: panelFetch }),
    ),
    schedule: unless(hidden.schedule, () =>
      fetchSchedule({
        fetch: panelFetch,
        token,
        settings: layout.settings,
        datePreferences: layout.datePreferences,
        isVip: !!user.vip,
        schedule: dashboard.schedule,
        now,
      })),
    watchlist: unless(
      hidden.watchlist,
      () => fetchWatchlist({ fetch: panelFetch, token, datePreferences: layout.datePreferences }),
    ),
    lastThirtyDays: unless(hidden.lastThirtyDays, () =>
      fetchLastThirtyDays({
        fetch: panelFetch,
        token,
        slug: user.slug,
        timeZone: layout.datePreferences.timeZone,
        now,
      })),
    recentlyWatched: unless(
      hidden.recentlyWatched,
      () => fetchRecentlyWatched({ fetch: panelFetch, token, datePreferences: layout.datePreferences }),
    ),
    socialFeed: unless(hidden.socialFeed, () =>
      fetchSocialFeed({
        fetch: panelFetch,
        token,
        following,
        now,
        datePreferences: layout.datePreferences,
      })),
    recommendations: unless(hidden.recommendations, () =>
      fetchRecommendations({
        api: panelClient,
        following,
        now,
        order: layout.datePreferences.order,
        ignore: dashboard.recommendations,
      })),
  };
}
