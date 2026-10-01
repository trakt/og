<script lang="ts">
import MoviePage from '$lib/movies/MoviePage.svelte';

const { data } = $props();
</script>

<MoviePage {data} />
