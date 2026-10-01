<!-- OG's compact rating line under a poster title. -->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';
import { RATING_LABELS } from '$lib/components/rating/ratingPrompt';
const { rating }: { rating: number } = $props();
</script>
<span
  class="rating-line"><span class="heart" style:color="var(--rating-{rating})"><Icon svg={heart} /></span> <b>{rating}</b> — {RATING_LABELS[rating]}</span>
<style>
.rating-line {
  display: block;
  margin-block-start: var(--space-card-rating-top);
  color: var(--color-card-subtitle);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
  line-height: var(--line-height-card-rating);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
