<script lang="ts">
import ShowEpisodesPage from '$lib/shows/ShowEpisodesPage.svelte';

const { data } = $props();
</script>

<ShowEpisodesPage {data} />
