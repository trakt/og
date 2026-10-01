<!--
  The dashboard's Recently Watched panel: the viewer's last nine plays as
  fanart cards, one row of three at first, with the less and more pill for up to three. Pass the unawaited
  `fetchRecentlyWatched` promise from the loader, so the page streams in and this panel spins until it lands, and
  fails on its own if it doesn't.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import { browser } from '$app/environment';
import NoData from '$lib/components/empty/NoData.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import PageNavigator from '$lib/components/page-navigator/PageNavigator.svelte';
import { rowCount } from '$lib/dashboard/rowCount';
import { savedRows } from '$lib/dashboard/savedRows';
import type { RecentPlay } from '$lib/dashboard/toRecentPlay';
import clockPlay from '$lib/icons/kit/thin-clock-circle-play.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import DashboardPanel from './DashboardPanel.svelte';

interface Props {
  plays: Promise<readonly RecentPlay[]>;
  /** The viewer's slug, for the history link and the saved row count. */
  username: string;
  /** Only VIPs could change the rows in OG; everyone else was sent to the VIP page. */
  isVip: boolean;
  datePreferences: DatePreferences;
}

const { plays, username, isVip, datePreferences }: Props = $props();

const PER_ROW = 3;
const storageKey = $derived(`recently_watched:${username}`);
// The cards only render in the browser, once the streamed promise lands, so SSR never needs the saved count.
let saved = $derived(browser ? savedRows.read(storageKey) : null);

function changeRows(rows: number) {
  saved = rows;
  savedRows.write(storageKey, rows);
}
</script>

{#snippet panel(loading: boolean, content: Snippet, footer?: Snippet)}
  <DashboardPanel
  --color-card-bg="var(--color-panel-quick-icons)"
  title="Recently Watched"
  icon={clockPlay}
  section
  {loading}
  seeMore={{ href: `/users/${username}/history`, text: 'History' }}
  {footer}
>
  <div class="body">{@render content()}</div>
</DashboardPanel>
{/snippet}

{#snippet card(play: RecentPlay)}
  {@const state = overlay.state(play.type, play.id, play.season)}
  <FanartCard
  href={play.href}
  title={play.title}
  year={play.year}
  number={play.number}
  smallTitle={play.smallTitle}
  image={play.image}
  tags={play.tags}
  userRating={state.rating}
  icons={{
      fill: quickIconFill({ state, datePreferences }),
      rating: play.rating,
      ratingTarget: { type: play.type, id: play.id, title: play.title },
      watchTarget: { type: play.type, id: play.id, title: play.title, runtime: play.runtime, season: play.season },
      favorite: true,
      favoriteTarget: play.favorite,
      watchNow: 'play',
      listLabel: play.type === 'movie' ? 'Add to watchlist' : 'Add to list',
    }}
/>
{/snippet}

{#await plays}
  {@render panel(true, pending)}
{:then items}
  {@const rows = rowCount({ rows: saved, items: items.length, perRow: PER_ROW })}
  {#snippet cards()}
    {#if items.length === 0}
      <div class="notice">
  <NoData>Add some TV shows and movies to your watched history and they'll show up here.</NoData>
</div>
    {:else}
      <div class="cards">
  <PosterGrid columns={PER_ROW} phoneColumns={1}>
          {#each items.slice(0, rows.rows * PER_ROW) as play (play.key)}
            {@render card(play)}
          {/each}
        </PosterGrid>
</div>
    {/if}
  {/snippet}
  {#snippet navigator()}
    <PageNavigator
  label="Recently Watched"
  rows={rows.rows}
  maxRows={rows.maxRows}
  onchange={changeRows}
  upsellHref={isVip ? undefined : '/vip/customization'}
/>
  {/snippet}
  {@render panel(false, cards, items.length > 0 ? navigator : undefined)}
{:catch}
  {@render panel(false, failed)}
{/await}

{#snippet pending()}{/snippet}

{#snippet failed()}
  <div class="notice">
  <NoData>Recently Watched didn't load. Refresh the page to try again.</NoData>
</div>
{/snippet}

<style>
/* OG's `h2.section` kept 28px under it, and its `.row.fanarts` 30px after the cards' own 20px. */
.body {
  padding-block: calc(var(--space-heading-section) - var(--gutter)) var(--space-fanarts-row-end);

  &:empty {
    padding-block: var(--space-heading-section) 0;
  }
}

/* OG's alert sat in the fanarts row, which kept 20px above it. */
.notice {
  padding-block-start: var(--gutter);
}

/* the panel fades in when its data lands, as OG's lazy panels did. */
.cards {
  animation: fade-in var(--transition-card) ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cards {
    animation: none;
  }
}
</style>
