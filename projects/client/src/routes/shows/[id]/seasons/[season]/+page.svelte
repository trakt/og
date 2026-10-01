<script lang="ts">
import SeasonPage from '$lib/shows/SeasonPage.svelte';
const { data } = $props();
</script>
<SeasonPage {data} />
