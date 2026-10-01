<!-- OG's: the heart heading, percentage and votes, then the 300px distribution chart. -->
<script lang="ts">
import RatingsChart from '$lib/components/users/RatingsChart.svelte';
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';
import type { RatingBar } from '$lib/users/profile/toRatingsChart';

const { percent, level, votes, bars }: { percent: number; level: number; votes: number; bars: readonly RatingBar[] } =
  $props();
</script>

<section id="trakt-ratings" aria-labelledby="trakt-ratings-heading">
  <h2
    id="trakt-ratings-heading"><span style:color={level > 0 ? `var(--rating-${level})` : undefined}><Icon svg={heart} /></span> Trakt Ratings</h2>
  <p
    class="totals"><strong>{percent}%</strong><span class="dash">—</span><strong>{votes.toLocaleString('en-US')}</strong> {votes === 1 ? 'vote' : 'votes'}</p>
  <RatingsChart {bars} media />
</section>

<style>
h2 {
  margin: 0;
  & span {
    margin-inline-end: var(--media-ratings-heart-gap);
  }
}
.totals {
  margin-block: var(--media-ratings-heading-gap) 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);
}
.totals strong {
  font-weight: var(--font-weight-headings);
}
.dash {
  margin-inline: var(--media-ratings-dash-gap);
  color: var(--gray-light);
}
</style>
