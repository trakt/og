<script lang="ts">
import MovieReleasesPage from '$lib/movies/MovieReleasesPage.svelte';

const { data } = $props();
</script>

<MovieReleasesPage {data} />
