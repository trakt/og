<!--
  The poster card on a discover slide: no title under it and
  no card borders, a soft dark glow, and a see-through quick-icon bar. Its width comes from `--slide-poster-width`,
  which the slider sets.
-->
<script lang="ts">
import PosterCard from '$lib/components/media/PosterCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { SlidePosterItem } from './SlidePosterItem.ts';

interface Props {
  item: SlidePosterItem;
  datePreferences: DatePreferences;
}

const { item, datePreferences }: Props = $props();
const state = $derived(overlay.state(item.type, item.id));
const icons = $derived({
  fill: quickIconFill({ state, airedEpisodes: item.airedEpisodes, runtime: item.runtime, datePreferences }),
  ratingTarget: { type: item.type, id: item.id, title: item.title },
  watchTarget: {
    type: item.type,
    id: item.id,
    title: item.title,
    airedEpisodes: item.airedEpisodes,
    runtime: item.runtime,
  },
  rating: item.released ? item.rating : undefined,
  // ponytail: OG showed watch now only with sources in the viewer's country. Until brings sources to cards,
  // anything not out yet is taken to have none, like the chart pages.
  watchNow: item.released ? ('play' as const) : undefined,
});
</script>

<div class="posters">
  <PosterCard
    href={item.href}
    title={item.title}
    fullTitle={item.fullTitle}
    image={item.poster}
    userRating={state.rating}
    dropped={state.dropped}
    hideTitles
    {icons}
  />
</div>

<style>
.posters {
  --color-card-border: transparent;
  display: inline-block;
  inline-size: var(--slide-poster-width);
  box-shadow: var(--shadow-slider-poster);
  text-align: start;
  white-space: normal;

  & :global(.quick-icons.small) {
    --bar: var(--slider-quick-icons-height);
    border: 0;
    background-color: var(--color-slider-quick-icons);
  }

  & :global(.poster) {
    border: 0;
  }
}
</style>
