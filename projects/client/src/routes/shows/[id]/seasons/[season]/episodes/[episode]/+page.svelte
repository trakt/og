<script lang="ts">
import EpisodePage from '$lib/shows/EpisodePage.svelte';
const { data } = $props();
</script>
<EpisodePage {data} />
