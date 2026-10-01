<!--
  OG's related band under a summary: a dark
  full-width section, "If you like <Title>, check out...", with six poster cards that load as the band nears the
  viewport, or three fanart cards on phones. Each card has its quick icons.
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { RelatedCard } from '$lib/summary/toRelatedCard';
import LazySection from './LazySection.svelte';

interface Props {
  /** The item's title, bold in the heading. */
  title: string;
  load: () => Promise<readonly RelatedCard[] | null>;
  datePreferences: DatePreferences;
}

const { title, load, datePreferences }: Props = $props();
const id = $props.id();

const icons = (card: RelatedCard) => {
  const state = overlay.state(card.type, card.id);
  return {
    fill: quickIconFill({ state, airedEpisodes: card.airedEpisodes, runtime: card.runtime, datePreferences }),
    ratingTarget: { type: card.type, id: card.id, title: card.title },
    collectionTarget: { type: card.type, id: card.id, title: card.title, airedEpisodes: card.airedEpisodes },
    rating: card.rating,
    released: card.released,
    // ponytail: OG showed watch now only with sources in the viewer's country. Until brings sources to cards,
    // anything not out yet is taken to have none, like the chart pages.
    watchNow: card.released ? ('play' as const) : undefined,
  };
};
</script>

<section class="related" aria-labelledby="{id}-heading">
  <Container>
    <h2 id="{id}-heading">If you like <strong>{title}</strong>, check out...</h2>
    <LazySection {load}>
      {#snippet children(cards)}
        <div class="posters">
          <PosterGrid columns={6}>
            {#each cards as card (card.id)}
              <PosterCard
                href={card.href}
                title={card.title}
                fullTitle={card.year ? `${card.title} (${card.year})` : card.title}
                image={card.poster}
                userRating={overlay.state(card.type, card.id).rating}
                dropped={overlay.state(card.type, card.id).dropped}
                icons={icons(card)}
              />
            {/each}
          </PosterGrid>
        </div>
        <div class="fanarts">
          <PosterGrid columns={1}>
            {#each cards.slice(0, 3) as card (card.id)}
              <FanartCard
                href={card.href}
                title={card.title}
                year={card.year}
                image={card.fanart}
                userRating={overlay.state(card.type, card.id).rating}
                dropped={overlay.state(card.type, card.id).dropped}
                icons={icons(card)}
              />
            {/each}
          </PosterGrid>
        </div>
      {/snippet}
    </LazySection>
  </Container>
</section>

<style>
.related {
  /* OG's `#recommendations-wrapper .grid-item`: white titles and no card borders on the dark band. */
  --color-text: var(--color-related-text);
  --color-card-border: transparent;
  min-block-size: var(--related-min-height);
  padding-block-end: var(--gutter);
  background-color: var(--color-related-bg);
  color: var(--color-related-text);

  & h2 {
    margin-block: var(--gutter) 0;
    color: var(--color-related-text);
  }

  & :global(.poster-grid-frame) {
    margin-block-end: 0;
  }
}

/* OG's `.hidden-xs` posters and `.visible-xs` fanarts. */
.fanarts {
  display: none;
}

@media (width < 768px) {
  .related {
    min-block-size: 0;
  }

  .posters {
    display: none;
  }

  .fanarts {
    display: block;
  }
}
</style>
