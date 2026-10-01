<!--
  The framed poster at the top of a summary's sidebar : a 3px border and a soft
  shadow, the placeholder when there's no image. Overlay badges come with the overlay work.
-->
<script lang="ts">
import { page } from '$app/state';
import { formatDate } from '$lib/utils/formatDate';
import RewatchingBadge from '$lib/components/media/RewatchingBadge.svelte';
import DroppedBadge from '$lib/components/media/DroppedBadge.svelte';
import CornerRating from '$lib/components/media/CornerRating.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { ComponentProps } from 'svelte';
import EpisodeTypeBadge from '$lib/components/media/EpisodeTypeBadge.svelte';
import type { RatingTarget } from '$lib/components/rating/RatingTarget';

interface Props {
  /** Image URL. Left out, the placeholder shows. */
  image?: string;
  episodeBadge?: ComponentProps<typeof EpisodeTypeBadge>;
  alt: string;
  /** The first four list posters, in list order, form OG's quartered list cover. */
  posters?: readonly { image?: string }[];
  ratingTarget?: RatingTarget;
  /** Episodes display their parent show's dropped and rewatching badges on the season poster. */
  showTarget?: RatingTarget & { readonly type: 'show' };
}

const { image, alt, posters, ratingTarget, showTarget, episodeBadge }: Props = $props();
const badgeTarget = $derived(showTarget ?? ratingTarget);
const state = $derived(badgeTarget ? overlay.state(badgeTarget.type, badgeTarget.id) : undefined);
</script>

<div class={['summary-poster', { dropped: state?.dropped }]}>
  {#if image}
    <img src={image} {alt} />
  {:else}
    <span class="placeholder" role="img" aria-label={alt}></span>
  {/if}
  {#if episodeBadge}<EpisodeTypeBadge {...episodeBadge} />{/if}
  {#if posters}
    <div class="collage" aria-hidden="true">
      {#each posters.slice(0, 4) as poster, i (i)}
        {#if poster.image}<img src={poster.image} alt="" />{:else}<span class="placeholder"></span>{/if}
      {/each}
    </div>
  {/if}
  {#if state?.rewatching}<RewatchingBadge date={state.rewatchingAt ? formatDate(state.rewatchingAt, page.data.datePreferences) : undefined} />{/if}
  {#if state?.dropped && badgeTarget?.type === 'show'}<DroppedBadge target={{ ...badgeTarget, type: 'show' }} date={state.droppedAt ? formatDate(state.droppedAt, page.data.datePreferences) : undefined} />{/if}
  {#if ratingTarget}
    {@const rating = overlay.state(ratingTarget.type, ratingTarget.id).rating}
    {#if rating}<CornerRating {rating} />{/if}
  {/if}
</div>

<style>
.summary-poster {
  position: relative;
  border: 3px solid var(--color-summary-poster-border);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-summary-poster);

  &.dropped img {
    filter: grayscale(1);
  }
  & :is(img, .placeholder) {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-poster);
    object-fit: cover;
  }
}
.collage {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  overflow: hidden;
  & :is(img, .placeholder) {
    inline-size: 100%;
    block-size: 100%;
    aspect-ratio: auto;
    object-fit: cover;
  }
}
.placeholder {
  background-image: var(--image-placeholder-poster);
  background-size: cover;
}
</style>
