<!--
  One of discover's "Top... Last Week" sliders: the ten
  most watched shows or movies, each a poster card with no title under it and its watchers, plays and libraries,
  over the item's fanart. Rank pills and the p/n keys step through them.
-->
<script lang="ts">
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import FanartSlider from '$lib/components/slider/FanartSlider.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import SlidePoster from './SlidePoster.svelte';
import type { TopSlide } from './toTopSlide.ts';

interface Props {
  title: string;
  /** The chart the "See more" link opens. */
  seeMoreHref: string;
  slides: readonly TopSlide[];
  datePreferences: DatePreferences;
}

const { title, seeMoreHref, slides, datePreferences }: Props = $props();
const fanarts = $derived(slides.map((slide) => slide.fanart));
</script>

<FanartSlider {title} {fanarts} ranks keys>
  {#snippet action()}
    <SeeMore href={seeMoreHref} />
  {/snippet}

  {#snippet slide(index)}
    {@const item = slides[index]}
    {#if item}
      <div class="item">
        <SlidePoster {item} {datePreferences} />
        <ul class="stats">
          {#each item.stats as stat (stat.label)}
            <li><b>{stat.value}</b> <span>{stat.label}</span></li>
          {/each}
        </ul>
      </div>
    {/if}
  {/snippet}
</FanartSlider>

<style>
.item {
  --slide-poster-width: var(--slider-poster-width);
  inline-size: 100%;
  white-space: nowrap;

  @media (width < 768px) {
    --slide-poster-width: var(--slider-poster-width-phone);
  }
}

.stats {
  display: flex;
  justify-content: center;
  margin: var(--slider-stats-top) 0 0;
  padding: 0 0 var(--slider-stats-bottom);
  list-style: none;
}

li {
  display: grid;
  margin: 0 var(--slider-stat-inline);
  line-height: 1;
  text-shadow: var(--text-shadow-headings);
}

b {
  font-family: var(--font-headings);
  font-size: var(--font-size-slider-stat);
  font-weight: var(--font-weight-headings-heavy);
}

span {
  color: var(--color-slider-muted);
  font-size: var(--font-size-slider-stat-label);
}
</style>
