<script lang="ts">
import DashboardGreeting from '$lib/components/dashboard/DashboardGreeting.svelte';
import DashboardStats from '$lib/components/dashboard/DashboardStats.svelte';
import DashboardInbox from '$lib/components/dashboard/DashboardInbox.svelte';
import DashboardNotices from '$lib/components/dashboard/DashboardNotices.svelte';
import Container from '$lib/components/container/Container.svelte';
import { dashboardFrameFixture as sample } from '$lib/dashboard/dashboardFrameFixture';
import { dayIn } from '$lib/calendars/calendarDays';

let theme = $state('light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Dashboard frame: og</title>
</svelte:head>

<main>
  <DashboardGreeting user={sample.user} memberSince="Aug 20, 2020 12:23 PM" watching={null}>
    {#snippet stats()}<DashboardStats stats={sample.stats} slug="og_tester" collected={sample.collected} />{/snippet}
  </DashboardGreeting>
  <DashboardNotices notices={{ welcome: true, anniversary: '6th', additionalLists: 6 }}
    day={dayIn(new Date().toISOString(), 'UTC')} />
  <DashboardInbox requests={sample.requests} />
  <Container>
    <h2>Dashboard frame components</h2>
    <p>Fake data for the greeting, stats strip, Traktiversary banner, dismissible account welcome and inbox.</p>
    <label>Theme <select bind:value={theme}><option value="light">Light</option><option value="dark">Dark</option></select></label>
  </Container>
</main>
