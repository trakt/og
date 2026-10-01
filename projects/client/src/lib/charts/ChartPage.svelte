<!--
  One chart page: the Frame sidebar with the chart nav, then the
  flush fanart grid and the bottom pagination. `/shows/[chart]`, `/movies/[chart]` and `/movies/boxoffice` render it.
-->
<script lang="ts">
import { goto, invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import AdvancedFiltersPanel from '$lib/components/filters/AdvancedFiltersPanel.svelte';
import AdvancedFiltersToggle from '$lib/components/filters/AdvancedFiltersToggle.svelte';
import AppliedFilters from '$lib/components/filters/AppliedFilters.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import FiltersUpsell from '$lib/components/filters/FiltersUpsell.svelte';
import { type AdvancedFilters, advancedFiltersSearch } from '$lib/components/filters/advancedFilters';
import { fromFilterDraft, toFilterDraft } from '$lib/components/filters/filterDraft';
import { filterTags } from '$lib/components/filters/filterTags';
import { watchNowTiles } from '$lib/components/filters/watchNowFilter';
import {
  apiHideOptions,
  type FadeHide,
  type FadeHideOption,
  fadeHideOptions,
  matchesFadeHide,
} from '$lib/components/filters/fadeHide';
import Frame from '$lib/components/frame/Frame.svelte';
import FrameGrid from '$lib/components/frame/FrameGrid.svelte';
import FrameNav from '$lib/components/frame/FrameNav.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import NoResults from '$lib/components/empty/NoResults.svelte';
import PageNav from '$lib/components/pagination/PageNav.svelte';
import { pageHref } from '$lib/components/pagination/pageWindow';
import { overlay } from '$lib/overlay/overlay';
import { chartFilters } from '$lib/charts/chartFilters';
import { chartLinks } from '$lib/charts/chartLinks';
import { isPeriodChart } from '$lib/charts/chartNames';
import { chartPeriodText } from '$lib/charts/chartPeriod';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { loadBoxOffice } from '$lib/charts/loadBoxOffice';
import type { loadChart } from '$lib/charts/loadChart';

type Props = {
  data: Awaited<ReturnType<typeof loadChart> | ReturnType<typeof loadBoxOffice>> & {
    user: HeaderUser | null;
    datePreferences: DatePreferences;
  };
};

const { data }: Props = $props();

const noun = $derived(data.type === 'shows' ? 'show' : 'movie');
const title = $derived(data.type === 'shows' ? 'Shows' : 'Movies');
const periodText = $derived(chartPeriodText(data.period));

// The `meta(...)` call in each action.
const meta = $derived(
  data.chart === 'boxoffice' ? { title: 'Weekend Box Office', description: data.description } : {
    trending: {
      title: `Trending ${data.type}`,
      description: `All ${data.type} the Trakt community has watched recently!`,
    },
    popular: { title: `Popular ${data.type}`, description: `Popular ${data.type} as voted by the Trakt community.` },
    anticipated: {
      title: `Anticipated ${data.type}`,
      description: `Most anticipated ${data.type} in the Trakt community.`,
    },
    favorited: {
      title: `Most favorited ${data.type} for ${periodText}`,
      description: `The most favorited ${data.type} for ${periodText} by the Trakt community.`,
    },
    watched: {
      title: `Most watched ${data.type} for ${periodText}`,
      description: `Most watched ${data.type} for ${periodText} by the Trakt community.`,
    },
    played: {
      title: `Most played ${data.type} for ${periodText}`,
      description: `The most played ${data.type} for ${periodText} by the Trakt community.`,
    },
    library: {
      title: `${title} added to libraries for ${periodText}`,
      description: `${title} added to libraries for ${periodText} by the Trakt community.`,
    },
    recommendations: {
      title: `Recommended ${data.type}`,
      description: `Your personalized ${noun} recommendations.`,
    },
  }[data.chart],
);

const prevHref = $derived(data.page.current > 1 ? pageHref(page.url, data.page.current - 1) : undefined);
const nextHref = $derived(
  data.page.type === 'paginated' && data.page.current < data.page.total
    ? pageHref(page.url, data.page.current + 1)
    : undefined,
);

// Box office and recommendations have no eye menu.
const menu = $derived('fadeHide' in data && data.chart !== 'recommendations');
const options = $derived(fadeHideOptions.filter((option) => data.type === 'shows' || !('showsOnly' in option)));
let fadeHide = $derived<FadeHide>('fadeHide' in data ? data.fadeHide : { fade: [], hide: [] });

function save(next: FadeHide) {
  const reload = apiHideOptions.some((id) => fadeHide.hide.includes(id) !== next.hide.includes(id));
  fadeHide = next;
  // The loader asks the API to drop these, so the page comes back full instead of short.
  if (reload) invalidateAll();
}

// The advanced filters. Box office has none.
const vip = $derived(data.user?.isVip ?? false);
const advanced = $derived.by(() => {
  if (!('filters' in data)) return null;
  const config = chartFilters({ type: data.type, chart: data.chart, period: data.period, now: new Date() });
  // Only what this chart's panel offers counts, and a range at its ends is no filter.
  const filters = fromFilterDraft(toFilterDraft(data.filters, config), config);
  const tags = filterTags(filters);
  const tiles = watchNowTiles({
    watchnow: filters.watchnow,
    sources: data.filterSources ?? new Map(),
    country: data.watchNowCountry,
    favorites: data.watchNowFavorites,
  });
  return { config, filters, tags, tiles, count: tags.length + tiles.length };
});
let panelOpen = $state(false);
let funnel = $state<HTMLButtonElement>();
const panelId = $props.id();

function closePanel() {
  panelOpen = false;
  funnel?.focus();
}

function applyFilters(filters: AdvancedFilters, period: string | undefined) {
  if (!('filters' in data)) return;
  const search = advancedFiltersSearch(filters);
  const path = period && isPeriodChart(data.chart)
    ? `/${data.type}/${data.chart}/${period}`
    : `/${data.type}/${data.chart}`;
  panelOpen = false;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- a chart path built from the page's own params
  goto(search ? `${path}?${search}` : path);
}

const links = $derived(
  chartLinks({
    type: data.type,
    current: data.chart,
    period: data.period,
    search: page.url.searchParams,
    signedIn: data.user !== null,
  }),
);
</script>

<svelte:head>
  <title>{meta.title} - Trakt</title>
  <meta name="description" content={meta.description} />
</svelte:head>

{#snippet filtersPanel()}
  {#if advanced && 'filters' in data}
    <AdvancedFiltersPanel
  id="{panelId}-filters"
  open={panelOpen}
  config={advanced.config}
  filters={data.filters}
  {vip}
  country={data.watchNowCountry}
  favorites={data.watchNowFavorites}
  sources={data.filterSources}
  clearHref={page.url.pathname}
  onapply={applyFilters}
  onclose={closePanel}
/>
  {/if}
{/snippet}

<Frame {title} {prevHref} {nextHref} panel={advanced ? filtersPanel : undefined} {panelOpen}>
  {#snippet subtitle()}
    {#if data.chart === 'boxoffice'}
      {data.description}
    {:else if data.chart === 'trending'}
      <b>{data.watcherCount.toLocaleString('en-US')}</b> {data.watcherCount === 1 ? 'watcher' : 'watchers'} of
      <b>{data.itemCount.toLocaleString('en-US')}</b> {data.itemCount === 1 ? noun : data.type}!
    {:else if data.chart === 'popular'}
      The most popular {data.type} for <strong>all time</strong>.
    {:else if data.chart === 'recommendations'}
      Your personalized {noun} recommendations.
    {:else if data.chart === 'anticipated'}
      The most anticipated {data.type} based on the number of lists a {noun} appears on.
    {:else if data.chart === 'favorited'}
      The most favorited {data.type} for <b>{periodText}</b>.
    {:else if data.chart === 'watched'}
      The most watched {data.type} for <b>{periodText}</b>. Sorted by number of unique watchers.
    {:else if data.chart === 'played'}
      The most played {data.type} for <b>{periodText}</b>. Sorted by number of plays.
    {:else}
      {title} added to libraries for <b>{periodText}</b>. Sorted by number of owners.
    {/if}
  {/snippet}

  {#snippet icons()}
    {#if menu}
      <FadeHideMenu value={fadeHide} {options} cookie={data.type} onchange={save} />
    {/if}
    {#if advanced}
      <AdvancedFiltersToggle bind:open={panelOpen} bind:button={funnel} controls="{panelId}-filters"
        active={advanced.count > 0} count={vip ? advanced.count : 0} />
    {/if}
  {/snippet}

  {#snippet sidebar()}
    {#if advanced && advanced.count > 0 && !vip}
      <AppliedFilters tags={advanced.tags} tiles={advanced.tiles} {vip} clearHref={page.url.pathname}
        onedit={() => (panelOpen = true)} />
    {/if}
    <FrameNav heading="Trakt" {links}>
      {#snippet current()}
        {#if advanced && advanced.count > 0 && vip}
          <AppliedFilters tags={advanced.tags} tiles={advanced.tiles} {vip} clearHref={page.url.pathname}
            onedit={() => (panelOpen = true)} />
        {/if}
      {/snippet}
    </FrameNav>
  {/snippet}


  {#if data.cards.length > 0}
    {#if 'upsellHidden' in data && !data.upsellHidden}
      <FiltersUpsell {vip} signedIn={data.user !== null} />
    {/if}
    <FrameGrid>
      {#each data.cards as card (card.id)}
        {@const state = overlay.state(card.type, card.id)}
        {@const fill = quickIconFill({ state, airedEpisodes: card.airedEpisodes, datePreferences: data.datePreferences })}
        {@const matches = (id: FadeHideOption) => matchesFadeHide(id, state, fill)}
        {#if !menu || !fadeHide.hide.some(matches)}
        <FanartCard
          href={card.href}
          title={card.title}
          year={card.year}
          image={card.image}
          tags={card.tags}
          userRating={state.rating}
          dropped={state.dropped}
          faded={menu && fadeHide.fade.some(matches)}
          icons={{
            fill,
            ratingTarget: { type: card.type, id: card.id, title: card.title },
            watchTarget: { type: card.type, id: card.id, title: card.title, airedEpisodes: card.airedEpisodes, runtime: card.runtime },
            rating: card.released ? card.rating : undefined,
            // movies/_boxoffice.html.slim is the one chart grid without the favorite action.
            favorite: data.chart !== 'boxoffice',
            // ponytail: OG showed watch now only with sources in the user's country. Until #60 brings sources, an
            // item that isn't out yet is taken to have none.
            watchNow: card.released ? 'play' : undefined,
          }}
        />
        {/if}
      {/each}
    </FrameGrid>
    <div class="page-nav">
      <PageNav {prevHref} {nextHref} />
    </div>
  {:else}
    <div class="no-results">
      <NoResults />
    </div>
  {/if}
</Frame>

<style>
.page-nav:has(:global(nav)) {
  border-block-end: 1px solid var(--color-frame-border);
}

/* OG centred the droids in the frame from 1025px up. */
.no-results {
  display: grid;
  place-items: center;
  min-block-size: calc(100vh - var(--header-height));
}
</style>
