<!--
  A show summary's recent episodes : "Up Next" or "Next Episode" over the
  first card, "Recently Aired" with "All Episodes" over the rest, three fanart cards a row. Nothing renders without
  episodes.
-->
<script lang="ts">
import FanartCard from '$lib/components/media/FanartCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { EpisodeCard } from './toShowSummary.ts';

interface Props {
  upNext: boolean;
  next?: EpisodeCard;
  aired: readonly EpisodeCard[];
  allHref: string;
  datePreferences: DatePreferences;
}

const { upNext, next, aired, allHref, datePreferences }: Props = $props();
const cards = $derived(next ? [next, ...aired] : aired);
</script>

{#snippet card({ id, rating, released, collectionContext, ...episode }: EpisodeCard)}
  {@const state = overlay.state('episode', id, collectionContext)}
  <FanartCard
  {...episode}
  userRating={state.rating}
  icons={{ ratingTarget: { type: 'episode', id, title: episode.title }, collectionTarget: { type: 'episode', id, title: episode.title, season: collectionContext }, fill: quickIconFill({ state, datePreferences }), rating, released, listLabel: 'Add to list', watchNow: 'play' }}
/>
{/snippet}

{#if cards.length > 0}
  <section class="recent-episodes" id="recent-episodes" aria-label="Recent episodes">
  <div class={['headings', { 'with-next': next }]}>
      {#if next}<h2 class="next">{upNext ? 'Up Next' : 'Next Episode'}</h2>{/if}
      {#if aired.length > 0}
        <div class="aired">
          <h2>Recently Aired</h2>
          <SeeMore href={allHref} text="All Episodes" />
        </div>
      {/if}
    </div>
  <div class="cards">
      {#each cards as episode (episode.id)}
        <div>{@render card(episode)}</div>
      {/each}
    </div>
</section>
{/if}

<style>
.recent-episodes {
  container-type: inline-size;
}

.headings,
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: var(--gutter);
}

h2 {
  margin-block-start: var(--gutter);
}

.aired {
  grid-column: span 3;
  display: flex;
  align-items: baseline;
  justify-content: space-between;

  .with-next & {
    grid-column: span 2;
  }
}

.cards {
  row-gap: var(--gutter);
  margin-block: var(--gutter);
}

/* OG's col-sm-6: two a row, and the headings stack. */
@container (width < 720px) {
  .headings {
    display: block;
  }

  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (width < 480px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
