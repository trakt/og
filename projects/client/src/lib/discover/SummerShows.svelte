<!--
  Discover's Summer TV Shows showcase: the shows on the
  new-shows list in random order, one a slide over its full-size fanart. The poster card sits left of the text: the
  title linking to the show, when and where it premiered, its genres and the overview clamped to 11 lines. The
  chevrons step through the slides and wrap around; there are no rank pills or keys. OG hid it below 768px, and so
  does og, along with its nav link.
-->
<script lang="ts">
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import FanartSlider from '$lib/components/slider/FanartSlider.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import SlidePoster from './SlidePoster.svelte';
import { summerShowcase } from './summerShowcase.ts';
import type { ShowcaseSlide } from './toShowcaseSlide.ts';

interface Props {
  slides: readonly ShowcaseSlide[];
  datePreferences: DatePreferences;
}

const { slides, datePreferences }: Props = $props();
const fanarts = $derived(slides.map((slide) => slide.fanart));
</script>

<!-- Show hrefs point at routes resolve() can't type from a string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section id="featured-shows" class="showcase">
  <FanartSlider title={summerShowcase.title} {fanarts}>
    {#snippet action()}
      <SeeMore href={summerShowcase.seeMore.href} text={summerShowcase.seeMore.text} />
    {/snippet}

    {#snippet slide(index)}
      {@const item = slides[index]}
      {#if item}
        <div class="item">
          <div class="info">
            <div class="poster"><SlidePoster {item} {datePreferences} /></div>
            <a href={item.href}><h3>{item.title}</h3></a>
            {#if item.airs}<p class="meta">{item.airs}</p>{/if}
            {#if item.premiere}<p class="meta">{item.premiere}</p>{/if}
            {#if item.genres}<p class="meta">{item.genres}</p>{/if}
            {#if item.overview}<p class="overview">{item.overview}</p>{/if}
          </div>
        </div>
      {/if}
    {/snippet}
  </FanartSlider>
</section>

<style>
.showcase {
  @media (width < 768px) {
    display: none;
  }
}

.item {
  --slide-poster-width: var(--showcase-poster-width);
  position: relative;
  place-self: stretch;
}

/* OG's `.item-info`: a column from 40% to 80% across, its top 150px above the middle. */
.info {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: 0;
  inline-size: var(--showcase-info-width);
  margin-block-start: var(--showcase-info-lift);
  padding-inline-end: var(--showcase-info-end);
  text-align: start;
  text-shadow: var(--text-shadow-headings);
}

.poster {
  position: absolute;
  inset-inline-start: var(--showcase-poster-offset);
  text-shadow: none;
}

a {
  color: var(--color-showcase-link);

  &:is(:hover, :focus-visible) {
    color: var(--color-showcase-link);
    text-decoration: none;
  }
}

h3 {
  margin: 0 0 var(--showcase-title-gap);
  font-size: var(--font-size-showcase-title);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
}

.meta {
  margin: 0 0 var(--showcase-meta-gap);
  color: var(--color-slider-muted);
  font-family: var(--font-headings);
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
}

.overview {
  display: -webkit-box;
  max-block-size: var(--showcase-overview-height);
  margin: var(--showcase-overview-gap) 0 0;
  overflow: hidden;
  font-size: var(--font-size-showcase-overview);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--showcase-overview-lines);
  line-clamp: var(--showcase-overview-lines);
}
</style>
