<!--
  My Shows & Movies as a signed-in viewer sees it: the My nav above the All nav, on a demo viewer's week.
-->
<script lang="ts">
import CalendarPage from '$lib/calendars/CalendarPage.svelte';
import Header from '$lib/components/header/Header.svelte';
import Footer from '$lib/components/footer/Footer.svelte';

const { data } = $props();
</script>

<Header user={data.user} />
<main id="content">
  <CalendarPage {data} />
</main>
<Footer username={data.user.slug} />
