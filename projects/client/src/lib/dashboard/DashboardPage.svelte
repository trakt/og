<script lang="ts">
import DashboardGreeting from '$lib/components/dashboard/DashboardGreeting.svelte';
import DashboardStats from '$lib/components/dashboard/DashboardStats.svelte';
import DashboardInbox from '$lib/components/dashboard/DashboardInbox.svelte';
import DashboardNotices from '$lib/components/dashboard/DashboardNotices.svelte';
import UpNextPanel from '$lib/components/dashboard/UpNextPanel.svelte';
import SchedulePanel from '$lib/components/dashboard/SchedulePanel.svelte';
import WatchlistPanel from '$lib/components/dashboard/WatchlistPanel.svelte';
import RecentlyWatchedPanel from '$lib/components/dashboard/RecentlyWatchedPanel.svelte';
import LastThirtyDaysPanel from '$lib/components/dashboard/LastThirtyDaysPanel.svelte';
import RecommendationsPanel from '$lib/components/dashboard/RecommendationsPanel.svelte';
import SocialFeedPanel from '$lib/components/dashboard/SocialFeedPanel.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { loadDashboard } from '$lib/dashboard/loadDashboard';
import type { DatePreferences } from '$lib/settings/DatePreferences';

const { data }: { data: Awaited<ReturnType<typeof loadDashboard>> & { datePreferences: DatePreferences } } = $props();
const collection = $derived(overlay.collectionCounts());
const username = $derived(data.profile.slug);
const isVip = $derived(!!data.profile.vip);
</script>

<svelte:head>
  <title>Dashboard - Trakt</title>
  <meta name="description"
    content="Your Trakt dashboard: watching statistics, follow requests and what to watch next." />
</svelte:head>

<DashboardGreeting user={data.profile} memberSince={data.memberSince} watching={data.watching}>
  {#snippet stats()}
    <DashboardStats stats={data.stats} slug={username} collected={collection} covered={!!data.profile.coverUrl || !!data.watching} />
  {/snippet}
</DashboardGreeting>
<DashboardNotices notices={data.notices} day={data.noticeDay} />
<DashboardInbox requests={data.requests} />
<!-- A panel the viewer hid comes back null. -->
{#if data.upNext}
  <UpNextPanel upNext={data.upNext} {username} {isVip} settings={data.dashboard.upNext} />
{/if}
{#if data.schedule}
  <SchedulePanel schedule={data.schedule} filter={data.dashboard.schedule.filter} />
{/if}
{#if data.watchlist}
  <WatchlistPanel watchlist={data.watchlist} {username} {isVip} datePreferences={data.datePreferences} />
{/if}
{#if data.lastThirtyDays}
  <LastThirtyDaysPanel stats={data.lastThirtyDays} />
{/if}
{#if data.recentlyWatched}
  <RecentlyWatchedPanel plays={data.recentlyWatched} {username} {isVip} datePreferences={data.datePreferences} />
{/if}
{#if data.socialFeed}
  <SocialFeedPanel plays={data.socialFeed} />
{/if}
{#if data.recommendations}
  <RecommendationsPanel recommendations={data.recommendations} {username} {isVip}
  datePreferences={data.datePreferences} />
{/if}
