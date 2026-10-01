<script lang="ts">
import { browser } from '$app/environment';
import LastThirtyDaysPanel from '$lib/components/dashboard/LastThirtyDaysPanel.svelte';
import RecentlyWatchedPanel from '$lib/components/dashboard/RecentlyWatchedPanel.svelte';
import RecommendationsPanel from '$lib/components/dashboard/RecommendationsPanel.svelte';
import SocialFeedPanel from '$lib/components/dashboard/SocialFeedPanel.svelte';
import SchedulePanel from '$lib/components/dashboard/SchedulePanel.svelte';
import UpNextPanel from '$lib/components/dashboard/UpNextPanel.svelte';
import WatchlistPanel from '$lib/components/dashboard/WatchlistPanel.svelte';
import Container from '$lib/components/container/Container.svelte';
import type { OnDeckItem } from '$lib/components/media/OnDeckItem';
import { dayIn } from '$lib/calendars/calendarDays';
import { toCalendarItems } from '$lib/calendars/toCalendarItems';
import type { DashboardRecommendations } from '$lib/dashboard/fetchRecommendations';
import type { DashboardWatchlist } from '$lib/dashboard/fetchWatchlist';
import type { LastThirtyDays } from '$lib/dashboard/LastThirtyDays';
import { lastThirtyDaysFixture } from '$lib/dashboard/lastThirtyDaysFixture';
import { recentlyWatchedFixture } from '$lib/dashboard/recentlyWatchedFixture';
import { recommendationsFixture } from '$lib/dashboard/recommendationsFixture';
import type { ScheduleDay } from '$lib/dashboard/ScheduleDay';
import { scheduleFixture } from '$lib/dashboard/scheduleFixture';
import { socialFeedFixture } from '$lib/dashboard/socialFeedFixture';
import { toLastThirtyDays } from '$lib/dashboard/toLastThirtyDays';
import { type RecentPlay, toRecentPlay } from '$lib/dashboard/toRecentPlay';
import { type SocialPlay, toSocialPlay } from '$lib/dashboard/toSocialPlay';
import { toScheduleDays } from '$lib/dashboard/toScheduleDays';
import { upcomingDays } from '$lib/dashboard/upcomingDays';
import { watchlistFixture } from '$lib/dashboard/watchlistFixture';
import { listItemSorts } from '$lib/lists/listItemSorts';
import { toListItemCard } from '$lib/lists/toListItemCard';
import { toOnDeckItem } from '$lib/progress/toOnDeckItem';
import { upNextFixture } from '$lib/progress/upNextFixture';
import { dashboardPrefs } from '$lib/dashboard/dashboardPrefs';
import { scheduleStart } from '$lib/dashboard/scheduleStart';
import { sortUpNext } from '$lib/dashboard/sortUpNext';
import { toDashboardSettings } from '$lib/dashboard/toDashboardSettings';

const { data } = $props();

const samples: readonly OnDeckItem[] = upNextFixture.entries.flatMap((entry) => {
  const lifetime = upNextFixture.lifetime.find(({ show }) => show.ids.trakt === entry.show.ids.trakt);
  const item = toOnDeckItem({ entry, lifetime, username: 'me' });
  return item ? [item] : [];
});

// Eight cards fill two rows, so the pill has somewhere to go.
const sample = Promise.resolve(samples);
const empty = Promise.resolve([]);
const loading = new Promise<readonly OnDeckItem[]>(() => {});
// Built in the browser only, so the server never sees an unhandled rejection.
const failed = browser ? Promise.reject(new Error('demo')) : loading;

function scheduleDays(isVip: boolean): ScheduleDay[] {
  const { timeZone } = data.datePreferences;
  const today = dayIn(new Date().toISOString(), timeZone);
  return toScheduleDays({
    days: upcomingDays({ items: toCalendarItems(scheduleFixture.rows(today)), start: today, timeZone, count: 5 }),
    today,
    datePreferences: data.datePreferences,
    isVip,
    offers: scheduleFixture.offers,
    country: 'us',
  });
}
// Five days, with network links as a VIP sees them; then two days as everyone else does.
const schedule = $derived(Promise.resolve(scheduleDays(true)));
const scheduleTwoDays = $derived(Promise.resolve(scheduleDays(false).slice(0, 2)));
const scheduleLoading = new Promise<readonly ScheduleDay[]>(() => {});
const scheduleFailed = browser ? Promise.reject(new Error('demo')) : scheduleLoading;

function watchlistSample(sortBy: string, sortHow: DashboardWatchlist['sortHow']): DashboardWatchlist {
  const { datePreferences } = data;
  return {
    cards: watchlistFixture.rows.map((row) => toListItemCard(row, { sortBy, datePreferences })),
    total: watchlistFixture.total,
    sortName: listItemSorts.find(({ by }) => by === sortBy)?.label ?? 'Rank',
    sortHow,
  };
}
// Added Date, newest first, as a VIP sees it; then Trakt Percentage for everyone else.
const watchlist = $derived(Promise.resolve(watchlistSample('added', 'desc')));
const watchlistRated = $derived(Promise.resolve(watchlistSample('percentage', 'asc')));
const watchlistEmpty = Promise.resolve({ cards: [], total: 0, sortName: 'Rank', sortHow: 'asc' as const });
const watchlistLoading = new Promise<DashboardWatchlist>(() => {});
const watchlistFailed = browser ? Promise.reject(new Error('demo')) : watchlistLoading;

const recentPlays = $derived(
  Promise.resolve(recentlyWatchedFixture.rows.map((row) => toRecentPlay(row, data.datePreferences))),
);
const recentLoading = new Promise<readonly RecentPlay[]>(() => {});
const recentFailed = browser ? Promise.reject(new Error('demo')) : recentLoading;

function lastThirtyDays(): LastThirtyDays {
  const { timeZone } = data.datePreferences;
  const now = new Date();
  const rows = lastThirtyDaysFixture.rows(dayIn(now.toISOString(), timeZone));
  const start = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  return toLastThirtyDays({ ...rows, start, slug: 'me', now, timeZone });
}
// Thirty days of plays and their genres; then the genres alone, which OG showed without the chart.
const lastMonth = $derived(Promise.resolve(lastThirtyDays()));
const genresOnly = $derived(lastMonth.then((stats) => ({ ...stats, days: [] })));
const lastMonthLoading = new Promise<LastThirtyDays>(() => {});
const lastMonthFailed = browser ? Promise.reject(new Error('demo')) : lastMonthLoading;

const socialPlays = $derived(
  Promise.resolve(socialFeedFixture.rows(new Date()).map((row) => toSocialPlay(row, data.datePreferences))),
);
const socialLoading = new Promise<readonly SocialPlay[]>(() => {});
const socialFailed = browser ? Promise.reject(new Error('demo')) : socialLoading;

// Ten shows and five movies from the two members you follow; then following nobody, with no movies at all; then one
// column failing.
const recs = Promise.resolve<DashboardRecommendations>({ ...recommendationsFixture, following: 2 });
const recsNoFollows = Promise.resolve<DashboardRecommendations>({
  shows: recommendationsFixture.shows.slice(0, 3),
  movies: [],
  following: 0,
});
const recsColumnFailed = Promise.resolve<DashboardRecommendations>({
  shows: null,
  movies: recommendationsFixture.movies,
  following: 1,
});
const recsLoading = new Promise<DashboardRecommendations>(() => {});
const recsFailed = browser ? Promise.reject(new Error('demo')) : recsLoading;

// A VIP's saved settings: Up Next by completion with favorites only and exact bars, finales from yesterday, and the
// Watchlist and Social Feed hidden. The fetchers apply the rest (worker sorts, season posters, the ignore switches).
const custom = toDashboardSettings({
  settings: {
    user: { vip: true },
    browsing: {
      progress: { on_deck: { sort: 'completed', sort_how: 'asc', simple_progress: false, only_favorites: true } },
      watchnow: { favorites: ['us-netflix', 'us-hulu', 'us-max'] },
    },
  },
  prefs: {
    ...dashboardPrefs.defaults,
    upcoming_filter: 'finales',
    upcoming_start_day: 'yesterday',
    hide_list: true,
    hide_network: true,
  },
});

// Each show's ticks, with an episode skipped halfway, as OG's exact bar shows a gap.
const customUpNext = Promise.resolve(
  sortUpNext({ entries: upNextFixture.entries, ...custom.upNext.sort }).flatMap((entry) => {
    const { aired, completed } = entry.progress;
    const skipped = Math.floor(completed / 2);
    const ticks = Array.from({ length: aired }, (_, i) => i !== skipped && i <= completed);
    const item = toOnDeckItem({ entry, username: 'me', ticks: entry.progress.reset_at ? undefined : ticks });
    return item ? [item] : [];
  }),
);

function customScheduleDays(): ScheduleDay[] {
  const { timeZone } = data.datePreferences;
  const today = dayIn(new Date().toISOString(), timeZone);
  const start = scheduleStart(today, custom.schedule.startDay);
  // The fixture's finales, moved so the first lands yesterday.
  const rows = scheduleFixture.rows(dayIn(new Date(Date.now() - 4 * 86_400_000).toISOString(), timeZone))
    .filter(({ episode, movie }) => movie || episode?.episode_type?.endsWith('finale'));
  return toScheduleDays({
    days: upcomingDays({ items: toCalendarItems(rows), start, timeZone, count: 5 }),
    today,
    datePreferences: data.datePreferences,
    isVip: true,
    offers: scheduleFixture.offers,
    country: 'us',
  });
}
const customSchedule = $derived(Promise.resolve(customScheduleDays()));
const hiddenNames = Object.entries({ Watchlist: custom.hidden.watchlist, 'Social Feed': custom.hidden.socialFeed })
  .flatMap(([name, hidden]) => (hidden ? [name] : []));

let theme = $state('light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Dashboard panels: og</title>
</svelte:head>

<main>
  <section class="intro">
    <Container>
      <h1>Dashboard panels</h1>
      <p>
        The panels the dashboard frame (#144) mounts: Up Next, the Upcoming Schedule, the Watchlist, Last 30 Days,
        Recently Watched, the Social Feed and the recommendations. Signed in, the first of each is yours; the rest use
        sample titles with made-up members, progress, dates and plays. Hover a progress bar for its tooltip, a schedule
        entry for its poster, or a day's bar for what was watched. Each panel's row count is kept in this browser.
        With nothing watched in 30 days, Last 30 Days hides itself, as OG's did.
      </p>
      <label>
        Theme
        <select bind:value={theme}>
          <option value="light">Light (OG default)</option>
          <option value="dark">Dark (dark knight)</option>
        </select>
      </label>
    </Container>
  </section>

  {#if data.viewer && data.upNext}
    <UpNextPanel upNext={data.upNext} username={data.viewer.username} isVip={data.viewer.isVip}
      settings={data.dashboard?.upNext} />
    <div class="gap"></div>
  {/if}
  <UpNextPanel upNext={sample} username="me" isVip />
  <div class="gap"></div>
  <UpNextPanel upNext={sample} username="demo-non-vip" isVip={false} />
  <div class="gap"></div>
  <UpNextPanel upNext={empty} username="me" isVip />
  <div class="gap"></div>
  <UpNextPanel upNext={loading} username="me" isVip />
  <div class="gap"></div>
  <UpNextPanel upNext={failed} username="me" isVip />
  <div class="gap"></div>

  <div id="schedule">
    {#if data.schedule}
      <SchedulePanel schedule={data.schedule} filter={data.dashboard?.schedule.filter} />
      <div class="gap"></div>
    {/if}
    <div id="schedule-sample"><SchedulePanel {schedule} /></div>
    <div class="gap"></div>
    <SchedulePanel schedule={scheduleTwoDays} />
    <div class="gap"></div>
    <div id="schedule-empty"><SchedulePanel schedule={Promise.resolve([])} /></div>
    <div class="gap"></div>
    <SchedulePanel schedule={scheduleLoading} />
    <div class="gap"></div>
    <SchedulePanel schedule={scheduleFailed} />
  </div>
  <div class="gap"></div>

  <div id="watchlist">
    {#if data.viewer && data.watchlist}
      <WatchlistPanel watchlist={data.watchlist} username={data.viewer.username} isVip={data.viewer.isVip}
        datePreferences={data.datePreferences} />
      <div class="gap"></div>
    {/if}
    <div id="watchlist-sample">
      <WatchlistPanel {watchlist} username="me" isVip datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <WatchlistPanel watchlist={watchlistRated} username="demo-non-vip" isVip={false}
      datePreferences={data.datePreferences} />
    <div class="gap"></div>
    <div id="watchlist-empty">
      <WatchlistPanel watchlist={watchlistEmpty} username="me" isVip datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <WatchlistPanel watchlist={watchlistLoading} username="me" isVip datePreferences={data.datePreferences} />
    <div class="gap"></div>
    <WatchlistPanel watchlist={watchlistFailed} username="me" isVip datePreferences={data.datePreferences} />
  </div>
  <div class="gap"></div>

  <div id="last-30-days">
    {#if data.lastThirtyDays}
      <LastThirtyDaysPanel stats={data.lastThirtyDays} />
      <div class="gap"></div>
    {/if}
    <div id="last-30-days-sample"><LastThirtyDaysPanel stats={lastMonth} /></div>
    <div class="gap"></div>
    <LastThirtyDaysPanel stats={genresOnly} />
    <div class="gap"></div>
    <LastThirtyDaysPanel stats={lastMonthLoading} />
    <div class="gap"></div>
    <LastThirtyDaysPanel stats={lastMonthFailed} />
  </div>
  <div class="gap"></div>

  <div id="recently-watched">
    {#if data.viewer && data.recentlyWatched}
      <RecentlyWatchedPanel plays={data.recentlyWatched} username={data.viewer.username} isVip={data.viewer.isVip}
        datePreferences={data.datePreferences} />
      <div class="gap"></div>
    {/if}
    <div id="recently-watched-sample">
      <RecentlyWatchedPanel plays={recentPlays} username="me" isVip datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <div id="recently-watched-empty">
      <RecentlyWatchedPanel plays={Promise.resolve([])} username="me" isVip datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <RecentlyWatchedPanel plays={recentLoading} username="me" isVip datePreferences={data.datePreferences} />
    <div class="gap"></div>
    <RecentlyWatchedPanel plays={recentFailed} username="me" isVip datePreferences={data.datePreferences} />
  </div>
  <div class="gap"></div>

  <div id="social-feed">
    {#if data.socialFeed}
      <SocialFeedPanel plays={data.socialFeed} />
      <div class="gap"></div>
    {/if}
    <div id="social-feed-sample"><SocialFeedPanel plays={socialPlays} /></div>
    <div class="gap"></div>
    <div id="social-feed-empty"><SocialFeedPanel plays={Promise.resolve([])} /></div>
    <div class="gap"></div>
    <SocialFeedPanel plays={socialLoading} />
    <div class="gap"></div>
    <SocialFeedPanel plays={socialFailed} />
  </div>
  <div class="gap"></div>

  <div id="recommendations">
    {#if data.viewer && data.recommendations}
      <RecommendationsPanel recommendations={data.recommendations} username={data.viewer.username}
        isVip={data.viewer.isVip} datePreferences={data.datePreferences} />
      <div class="gap"></div>
    {/if}
    <div id="recommendations-sample">
      <RecommendationsPanel recommendations={recs} username="me" isVip datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <div id="recommendations-empty">
      <RecommendationsPanel recommendations={recsNoFollows} username="demo-non-vip" isVip={false}
        datePreferences={data.datePreferences} />
    </div>
    <div class="gap"></div>
    <RecommendationsPanel recommendations={recsColumnFailed} username="me" isVip
      datePreferences={data.datePreferences} />
    <div class="gap"></div>
    <RecommendationsPanel recommendations={recsLoading} username="me" isVip datePreferences={data.datePreferences} />
    <div class="gap"></div>
    <RecommendationsPanel recommendations={recsFailed} username="me" isVip datePreferences={data.datePreferences} />
  </div>
  <div class="gap"></div>
  <section class="intro" id="settings">
    <Container>
      <h2>With dashboard settings</h2>
      <p>
        A VIP's saved settings, in fixtures: Up Next sorted by completion % with only favorites and exact progress bars
        (an episode skipped halfway through each show), the schedule's finales from yesterday, and the
        {hiddenNames.join(' and ')} panels hidden, so they're left out below.
      </p>
    </Container>
  </section>
  <div id="settings-up-next">
    <UpNextPanel upNext={customUpNext} username="me" isVip settings={custom.upNext} />
  </div>
  <div class="gap"></div>
  <div id="settings-schedule">
    <SchedulePanel schedule={customSchedule} filter={custom.schedule.filter} />
  </div>
  {#if !custom.hidden.watchlist}
    <WatchlistPanel {watchlist} username="me" isVip datePreferences={data.datePreferences} />
  {/if}
  {#if !custom.hidden.socialFeed}
    <SocialFeedPanel plays={socialPlays} />
  {/if}
  <div class="gap"></div>
  <RecentlyWatchedPanel plays={recentPlays} username="me" isVip datePreferences={data.datePreferences} />
</main>

<style>
.intro {
  padding-block-end: var(--gutter);
}

/* Room for the pill that hangs under each panel. */
.gap {
  block-size: calc(var(--gutter) * 2);
  background-color: var(--color-surface);
}
</style>
