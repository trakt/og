<script lang="ts">
import ChartPage from '$lib/charts/ChartPage.svelte';

const { data } = $props();
</script>

<ChartPage {data} />
