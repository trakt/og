<script lang="ts">
import RatingDistribution from '$lib/components/summary/RatingDistribution.svelte';
import Container from '$lib/components/container/Container.svelte';
import { toRatingsChart } from '$lib/users/profile/toRatingsChart';
const bars = toRatingsChart({
  '1': 143,
  '2': 239,
  '3': 115,
  '4': 483,
  '5': 447,
  '6': 2126,
  '7': 2522,
  '8': 6916,
  '9': 3232,
  '10': 8567,
}, { showEmpty: true }).bars;
</script>

<svelte:head>
  <title>Media stats - Trakt</title>
</svelte:head>
<div class="demo">
  <Container>
    <RatingDistribution percent={82} level={8} votes={24790} {bars} />
  </Container>
</div>

<style>
.demo {
  padding-block-start: calc(var(--header-height) + var(--gutter));
}
</style>
