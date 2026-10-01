<script lang="ts">
import RatingLine from '$lib/components/rating/RatingLine.svelte';
</script>
<h1>Poster rating lines</h1>
{#each Array.from({ length: 10 }, (_, i) => i + 1) as rating (rating)}<RatingLine {rating} />{/each}
