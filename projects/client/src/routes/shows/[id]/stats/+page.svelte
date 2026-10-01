<script lang="ts">
import StatsPage from '$lib/stats/StatsPage.svelte';
const { data } = $props();
</script>

<StatsPage {data} />
