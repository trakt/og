<!--
  The dashboard's Watchlist panel: the first 18 items of the viewer's
  watchlist in its own sort, one row of six at first, with the less and more pill for up to three. Pass the unawaited
  `fetchWatchlist` promise from the loader, so the page streams in and this panel spins until it lands, and fails on
  its own if it doesn't.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import { browser } from '$app/environment';
import NoData from '$lib/components/empty/NoData.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import PageNavigator from '$lib/components/page-navigator/PageNavigator.svelte';
import type { DashboardWatchlist } from '$lib/dashboard/fetchWatchlist';
import { rowCount } from '$lib/dashboard/rowCount';
import { savedRows } from '$lib/dashboard/savedRows';
import Icon from '$lib/icons/Icon.svelte';
import listCheck from '$lib/icons/thin/list-check.svg?raw';
import arrow from '$lib/icons/trakt/arrow-right.svg?raw';
import ListItemPoster from '$lib/lists/ListItemPoster.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import DashboardPanel from './DashboardPanel.svelte';

interface Props {
  watchlist: Promise<DashboardWatchlist>;
  /** The viewer's slug, for the watchlist link and the saved row count. */
  username: string;
  /** Only VIPs could change the rows in OG; everyone else was sent to the VIP page. */
  isVip: boolean;
  datePreferences: DatePreferences;
}

const { watchlist, username, isVip, datePreferences }: Props = $props();

const PER_ROW = 6;
const storageKey = $derived(`list:${username}`);
// The cards only render in the browser, once the streamed promise lands, so SSR never needs the saved count.
let saved = $derived(browser ? savedRows.read(storageKey) : null);

function changeRows(rows: number) {
  saved = rows;
  savedRows.write(storageKey, rows);
}

const allText = (total: number) => `All ${total.toLocaleString('en-US')} ${total === 1 ? 'item' : 'items'}`;
</script>

{#snippet panel(loading: boolean, content: Snippet, list?: DashboardWatchlist, footer?: Snippet)}
  <DashboardPanel
  --color-card-bg="var(--color-panel-quick-icons)"
  --panel-bg="var(--color-watchlist-bg)"
  title="Watchlist"
  icon={listCheck}
  {loading}
  seeMore={list ? { href: `/users/${username}/watchlist`, text: allText(list.total) } : undefined}
  customizeHref={list ? '/settings#dashboard' : undefined}
  help={list ? sorted : undefined}
  {footer}
>
    {@render content()}
  </DashboardPanel>
  {#snippet sorted()}
    Sorted by {list?.sortName}<span class={['direction', list?.sortHow]}><Icon svg={arrow} /></span>
  {/snippet}
{/snippet}

{#await watchlist}
  {@render panel(true, pending)}
{:then list}
  {@const rows = rowCount({ rows: saved, items: list.cards.length, perRow: PER_ROW })}
  {#snippet cards()}
    {#if list.cards.length === 0}
      <div class="notice">
  <NoData>Add some TV shows and movies to this list and they'll show up here.</NoData>
</div>
    {:else}
      <div class="cards">
  <PosterGrid columns={PER_ROW}>
          {#each list.cards.slice(0, rows.rows * PER_ROW) as item (item.key)}
            <ListItemPoster {item} {datePreferences} />
          {/each}
        </PosterGrid>
</div>
    {/if}
  {/snippet}
  {#snippet navigator()}
    <PageNavigator
  label="Watchlist"
  rows={rows.rows}
  maxRows={rows.maxRows}
  onchange={changeRows}
  upsellHref={isVip ? undefined : '/vip/customization'}
/>
  {/snippet}
  {@render panel(false, cards, list, list.cards.length > 0 ? navigator : undefined)}
{:catch}
  {@render panel(false, failed)}
{/await}

{#snippet pending()}{/snippet}

{#snippet failed()}
  <div class="notice">
  <NoData>The watchlist didn't load. Refresh the page to try again.</NoData>
</div>
{/snippet}

<style>
/* OG's alert sat in the posters row, which kept 20px above it. */
.notice {
  padding-block-start: var(--gutter);
}

/* OG's `trakt-icon-arrow-right.fa-rotate-90`: down for ascending, up for descending. */
.direction {
  display: inline-block;
  rotate: 90deg;

  &.desc {
    rotate: 270deg;
  }
}

/* the panel fades in when its data lands, as OG's lazy panels did. OG's `#list-items` kept no margin under
   the posters. */
.cards {
  margin-block-end: calc(-1 * var(--gutter));
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
