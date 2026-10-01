<!--
  A comment author's round avatar. When they rated the item, the ring takes the rating's colour and the top-right
  corner squares off under OG's rating triangle.
-->
<script lang="ts">
import CornerRating from '../media/CornerRating.svelte';

interface Props {
  src: string;
  /** The author's rating of the item, 1 to 10. */
  rating?: number | null;
}

const { src, rating }: Props = $props();
</script>

<span class="user-avatar" style:--ring={rating ? `var(--rating-${rating})` : undefined}>
  {#if rating}
    <span class="block"></span>
    <CornerRating {rating} small label="Rated {rating}" />
  {/if}
  <img {src} alt="" loading="lazy" decoding="async" />
</span>

<style>
.user-avatar {
  --ring: var(--color-avatar-border);
  position: relative;
  display: block;
  inline-size: var(--comment-avatar);
}

/* OG's `.corner-rating.block`: the corner square the round avatar sits on. */
.block {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  z-index: 1;
  inline-size: 50%;
  block-size: 50%;
  background-color: var(--ring);
}

img {
  position: relative;
  z-index: 5;
  display: block;
  inline-size: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 2px solid var(--ring);
  border-radius: 50%;
  background-color: var(--color-avatar-border);
}
</style>
