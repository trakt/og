<script lang="ts">
import ShowPage from '$lib/shows/ShowPage.svelte';

const { data } = $props();
</script>

<ShowPage {data} />
