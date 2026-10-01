<!--
  A show's seasons (OG's `h2#seasons` and `.season-posters`): "N Seasons" (specials don't count) with the sort
  dropdown and direction toggle, then five season posters a row with their episode counts and quick icons.
-->
<script lang="ts">
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import ItemStatIcons from '$lib/components/media/ItemStatIcons.svelte';
import { lazyItemStats } from '$lib/shows/lazyItemStats.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import SortHeading from '$lib/components/summary/SortHeading.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { SEASON_SORTS, type SeasonCard, type SeasonSort, sortSeasons } from './toShowSummary.ts';

interface Props {
  showId: number;
  seasons: readonly SeasonCard[];
  signedIn?: boolean;
  initialFilters?: FadeHide;
  datePreferences: DatePreferences;
}

const { showId, seasons, signedIn = false, initialFilters = { fade: [], hide: [] }, datePreferences }: Props = $props();

let filters = $derived(initialFilters);
const cards = $derived(
  seasons.map((card) => {
    const state = overlay.state('season', card.id, { show: showId, number: card.number });
    const fill = quickIconFill({ state, airedEpisodes: card.airedEpisodes, season: true, datePreferences });
    const matches = (id: (typeof fadeHideOptions)[number]['id']) => matchesFadeHide(id, state, fill);
    return {
      card,
      state,
      fill,
      hidden: signedIn && filters.hide.some(matches),
      faded: signedIn && filters.fade.some(matches),
    };
  }).filter(({ hidden }) => !hidden),
);
const count = $derived(cards.filter(({ card }) => card.number !== 0).length);
let by = $state<SeasonSort>('number');
let flipped = $state(false);
const stats = lazyItemStats({
  items: () => cards.map(({ card }) => ({ id: card.id, show: showId, season: card.number })),
  sort: () => by,
  fallback: () => 'number',
});
const sorted = $derived(
  sortSeasons({ cards: cards.map(({ card }) => card), by: stats.by, flipped, stats: stats.counts }),
);
</script>

{#if seasons.length > 0}
  <section class="seasons" aria-labelledby="seasons">
  <SortHeading id="seasons" {count} noun="Season" sorts={SEASON_SORTS} bind:by bind:flipped loading={stats.loading}>
    {#snippet controls()}{#if signedIn}<FadeHideMenu value={filters} options={fadeHideOptions} cookie="show" variant="default" onchange={(next) => (filters = next)} />{/if}{/snippet}
  </SortHeading>
  <PosterGrid columns={5}>
      {#each sorted as { id, number, rating, released, votes: _, airedEpisodes, episodes, ...card } (id)}
        {@const view = cards.find(({ card }) => card.id === id)}
        {@const state = view?.state ?? {}}
        <div {@attach stats.observe({ id, show: showId, season: number })}>
        <PosterCard
          {...card}
          faded={view?.faded}
          subtitles={[episodes]}
          userRating={state.rating}
          icons={{
            fill: quickIconFill({ state, airedEpisodes, season: true, datePreferences }),
            ratingTarget: { type: 'season', id, title: card.title },
            watchTarget: { type: 'season', id, title: card.fullTitle, season: { show: showId, number }, airedEpisodes },
            rating,
            released,
            listLabel: 'Add to list',
          }}
        >
          <ItemStatIcons href={card.href} stats={stats.counts.get(id)} compact />
        </PosterCard>
        </div>
      {/each}
    </PosterGrid>
</section>
{/if}
