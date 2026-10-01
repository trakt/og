<script lang="ts">
import ShowSeasonsPage from '$lib/shows/ShowSeasonsPage.svelte';

const { data } = $props();
</script>

<ShowSeasonsPage {data} />
