<script lang="ts">
import CalendarPage from '$lib/calendars/CalendarPage.svelte';

const { data } = $props();
</script>

<CalendarPage {data} />
