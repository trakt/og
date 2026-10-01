<!--
  A rating as a coloured triangle in the top-right corner, like OG's `.corner-rating`: the viewer's own on posters, or
  the author's on a comment avatar (`small`, 24px).
-->
<script lang="ts">
interface Props {
  /** 1 to 10. */
  rating: number;
  /** The 24px corner OG put on comment avatars. */
  small?: boolean;
  /** What the rating is, for screen readers. */
  label?: string;
}

const { rating, small = false, label = `Your rating: ${rating}` }: Props = $props();
</script>

<div class={['corner-rating', { small }]} style:--color="var(--rating-{rating})" role="img" aria-label={label}>
  <span class="text" aria-hidden="true">{rating}</span>
</div>

<style>
.corner-rating {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  z-index: 10;
  inline-size: 30px;
  block-size: 30px;
  background-color: var(--color);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

/* OG's geometry: a 15 by 30 box, 7px in, text on its top 12px, turned 45 degrees. */
.text {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 7px;
  inline-size: 15px;
  block-size: 30px;
  color: var(--color-card-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  font-size: var(--font-size-card-subtitle);
  line-height: 12px;
  text-align: center;
  rotate: 45deg;
}

/* Comment avatars: a 24px triangle, the same box 2px in, 11px text on a 10px line. */
.small {
  inline-size: var(--comment-rating-corner);
  block-size: var(--comment-rating-corner);

  & .text {
    inset-inline-start: 2px;
    font-size: var(--font-size-pill);
    line-height: 10px;
  }
}
</style>
