<!--
  The profile's Most Watched Shows and Most Watched Movies: two columns, each with Last 30 Days and All Time pill tabs over three
  posters with the time watched and plays under each title. The see-more link follows the active tab to the history
  page. Each column opens on its own default tab and names its own order (the owner's saved ones on their profile).
  Below tablet width the third poster hides, and on phones the columns stack.
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import PanelHeading from '$lib/components/dashboard/PanelHeading.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import cameraMovie from '$lib/icons/thin/camera-movie.svg?raw';
import tvRetro from '$lib/icons/thin/tv-retro.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { MostWatched, MostWatchedTab, MostWatchedType } from '$lib/users/profile/toMostWatched';

interface Props {
  shows: MostWatched;
  movies: MostWatched;
  slug: string;
  /** The Last 30 Days tab's first day, as the see-more link's `start_at`. */
  windowStart: string;
  /** Your own profile gets the Customize gear. */
  isSelf: boolean;
  /** The empty tab's line, from the words after the name: "hasn't watched any shows during this time period." */
  hasnt: (rest: string) => string;
  datePreferences: DatePreferences;
}

const { shows, movies, slug, windowStart, isSelf, hasnt, datePreferences }: Props = $props();

const TABS = [{ id: 'lastMonth', label: 'Last 30 Days' }, { id: 'allTime', label: 'All Time' }] as const;

const columns = [
  { type: 'shows', title: 'Most Watched Shows', icon: tvRetro },
  { type: 'movies', title: 'Most Watched Movies', icon: cameraMovie },
] as const;

const data = $derived({ shows, movies });
// Each column opens on its default tab until the viewer picks one.
const picked = $state<Partial<Record<MostWatchedType, MostWatchedTab>>>({});
const selected = (type: MostWatchedType) => picked[type] ?? data[type].tab;
const isTab = (id: string): id is MostWatchedTab => TABS.some((tab) => tab.id === id);

// OG's see-more link: the column's order, and `start_at` in UTC to the second with
// the colons left unescaped.
const seeMore = (type: MostWatchedType, sortBy: string, tab: MostWatchedTab) =>
  `/users/${slug}/history/${type}/${sortBy}${
    tab === 'lastMonth' ? `?start_at=${windowStart.replace(/\.\d+Z$/, 'Z')}` : ''
  }`;
</script>

<div class="most-watched">
  <Container>
    <div class="columns">
      {#each columns as column (column.type)}
        {@const headingId = `most-watched-${column.type}`}
        <section class="column" aria-labelledby={headingId}>
          <PanelHeading
            id={headingId}
            title={column.title}
            icon={column.icon}
            seeMore={{ href: seeMore(column.type, data[column.type].sortBy, selected(column.type)), text: 'See more' }}
            customizeHref={isSelf ? '/settings#profile' : undefined}
          />
          <div class="tabs">
            <PillTabs
              label={column.title}
              tabs={TABS}
              bind:selected={
                () => selected(column.type),
                (id) => {
                  if (id && isTab(id)) picked[column.type] = id;
                }
              }
            >
              {#snippet panel(id)}
                {@const cards = isTab(id) ? data[column.type][id] : []}
                {#if cards.length > 0}
                  <div class="posters">
                    {#each cards as card (card.id)}
                      {@const state = overlay.state(card.type, card.id)}
                      <PosterCard
                        href={card.href}
                        title={card.title}
                        image={card.image}
                        subtitles={[card.time, card.plays]}
                        userRating={state.rating}
                        icons={{
                          fill: quickIconFill({ state, airedEpisodes: card.airedEpisodes, datePreferences }),
                          rating: card.rating,
                          watchNow: 'play',
                          listLabel: 'Add to watchlist',
                        }}
                      />
                    {/each}
                  </div>
                {:else}
                  <div class="empty"><NoData>{hasnt(`watched any ${column.type} during this time period.`)}</NoData></div>
                {/if}
              {/snippet}
            </PillTabs>
          </div>
        </section>
      {/each}
    </div>
  </Container>
</div>

<style>
.most-watched {
  /* Holds the first heading's margin inside the background, like the clearfix on OG's container. */
  display: flow-root;
  background-color: var(--color-surface);
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gutter);

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}

/* OG's `.pill-tab-links.with-icon`: the pills line up with the heading's text. */
.tabs {
  margin-inline-start: var(--space-help-text-inline);

  /* The panel under them runs the column's full width. */
  & :global([role='tabpanel']) {
    margin-inline-start: calc(-1 * var(--space-help-text-inline));
  }
}

.posters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gutter);
  margin-block-end: var(--gutter);
  padding-block-start: var(--gutter);

  /* OG's col-sm-6 below 992px: two posters, the third hidden. */
  @media (max-width: 991px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    & > :global(:nth-child(3)) {
      display: none;
    }
  }
}

.empty {
  padding-block-start: var(--gutter);
}
</style>
