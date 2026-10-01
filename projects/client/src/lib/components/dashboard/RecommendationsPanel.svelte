<!--
  The dashboard's Show and Movie Recommendations: two half-width columns
  on a dark band, up to ten posters each, three to a row, one row at first with the dark less and more pill for up to
  three. Pass the unawaited `fetchRecommendations` promise from the loader, so the page streams in and both headings
  spin until it lands. Each column fails on its own.
-->
<script lang="ts">
import { browser } from '$app/environment';
import Container from '$lib/components/container/Container.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import PageNavigator from '$lib/components/page-navigator/PageNavigator.svelte';
import type { ChartCard } from '$lib/charts/toChartCard';
import type { DashboardRecommendations } from '$lib/dashboard/fetchRecommendations';
import { rowCount } from '$lib/dashboard/rowCount';
import { savedRows } from '$lib/dashboard/savedRows';
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import Icon from '$lib/icons/Icon.svelte';
import ban from '$lib/icons/light/ban.svg?raw';
import cameraMovie from '$lib/icons/thin/camera-movie.svg?raw';
import tvRetro from '$lib/icons/thin/tv-retro.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import PanelHeading from '$lib/components/dashboard/PanelHeading.svelte';
import PanelHelp from '$lib/components/dashboard/PanelHelp.svelte';

interface Props {
  recommendations: Promise<DashboardRecommendations>;
  /** The viewer's slug, for the saved row count. */
  username: string;
  /** Only VIPs could change the rows in OG; everyone else was sent to the VIP page. */
  isVip: boolean;
  datePreferences: DatePreferences;
}

const { recommendations, username, isVip, datePreferences }: Props = $props();

const PER_ROW = 3;
const COLUMNS = [
  { type: 'shows', title: 'Show Recommendations', icon: tvRetro },
  { type: 'movies', title: 'Movie Recommendations', icon: cameraMovie },
] as const;

const storageKey = $derived(`recommendations:${username}`);
// The cards only render in the browser, once the streamed promise lands, so SSR never needs the saved count.
let saved = $derived(browser ? savedRows.read(storageKey) : null);

function changeRows(rows: number) {
  saved = rows;
  savedRows.write(storageKey, rows);
}

function visible(recs: DashboardRecommendations): DashboardRecommendations {
  const keep = (items: readonly ChartCard[] | null) =>
    items?.filter((item) => !overlay.isHidden('recommendations', item.type, item.id)) ?? null;
  return { ...recs, shows: keep(recs.shows), movies: keep(recs.movies) };
}

// OG's longer column sets the rows for both .
const longest = (recs: DashboardRecommendations) => Math.max(recs.shows?.length ?? 0, recs.movies?.length ?? 0);
</script>

<!-- Hrefs point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet card(item: ChartCard)}
  {@const state = overlay.state(item.type, item.id)}
  <PosterCard
  href={item.href}
  title={item.title}
  image={item.image}
  userRating={state.rating}
  icons={{
      fill: quickIconFill({ state, airedEpisodes: item.airedEpisodes, datePreferences }),
      rating: item.released ? item.rating : undefined,
      ratingTarget: { type: item.type, id: item.id, title: item.title },
      watchTarget: {
        type: item.type,
        id: item.id,
        title: item.title,
        airedEpisodes: item.airedEpisodes,
        runtime: item.runtime,
      },
      watchNow: item.released ? 'play' : undefined,
    }}
>
  <div class="hide-line">
    <div
      class="hide">
      <VisibilityControl target={{ type: item.type, id: item.id, title: item.title }} action="hide"
        section="recommendations"
        variant="badge"><span class="hide-icon"><Icon svg={ban} /></span><span>Hide</span></VisibilityControl>
    </div>
  </div>
</PosterCard>
{/snippet}

{#snippet column(
  { type, title, icon }: (typeof COLUMNS)[number],
  loading: boolean,
  recs: DashboardRecommendations | null,
  rows: number,
)}
  {@const headingId = `recommendations-${type}`}
  {@const items = recs?.[type]}
  <section class="column" aria-labelledby={headingId} aria-busy={loading}>
    <PanelHeading
      id={headingId}
      {title}
      {icon}
      {loading}
      seeMore={{ href: `/${type}/recommendations`, text: 'More' }}
      customizeHref="/settings#dashboard"
    />
    {#if recs && recs.following !== null}
      <PanelHelp>
        {#if recs.following > 0}
          From the <b>{recs.following.toLocaleString('en-US')}</b> {recs.following === 1 ? 'member' : 'members'} you
          follow + the Trakt community.
        {:else}
          From the Trakt community. <em>Follow some Trakt members to improve these.</em>
        {/if}
      </PanelHelp>
    {/if}
    <div class="body">
      {#if !recs || loading}
        <!-- Nothing until the promise lands. -->
      {:else if !items}
        <div class="notice"><NoData>{title} didn't load. Refresh the page to try again.</NoData></div>
      {:else if items.length === 0}
        <div class="notice"><NoData>Start watching some shows and movies to get recommendations!</NoData></div>
      {:else}
        <div class="cards">
          <PosterGrid columns={PER_ROW} phoneColumns={PER_ROW}>
            {#each items.slice(0, rows * PER_ROW) as item (item.id)}
              {@render card(item)}
            {/each}
          </PosterGrid>
        </div>
      {/if}
    </div>
  </section>
{/snippet}

{#snippet band(loading: boolean, recs: DashboardRecommendations | null)}
  {@const rows = rowCount({ rows: saved, items: recs ? longest(recs) : 0, perRow: PER_ROW })}
  <div class="recommendations">
    <Container>
      <div class="columns">
        {#each COLUMNS as col (col.type)}
          {@render column(col, loading, recs, rows.rows)}
        {/each}
      </div>
    </Container>
    {#if recs && longest(recs) > 0}
      <PageNavigator
        label="Recommendations"
        rows={rows.rows}
        maxRows={rows.maxRows}
        onchange={changeRows}
        upsellHref={isVip ? undefined : '/vip/customization'}
        dark
      />
    {/if}
  </div>
{/snippet}

{#await recommendations}
  {@render band(true, null)}
{:then recs}
  {@render band(false, visible(recs))}
{:catch}
  {@render band(false, { shows: null, movies: null, following: null })}
{/await}

<style>
/* OG's `#recommendations-wrapper`: white headings and titles on in both themes, borderless posters. */
.recommendations {
  --color-text: var(--color-recommendations-text);
  --card-border-width: 0;
  --color-card-bg: var(--color-panel-quick-icons);
  --color-no-data-bg: var(--color-recommendations-no-data-bg);
  --color-no-data-text: var(--color-recommendations-no-data-text);
  --page-navigator-offset: var(--space-recommendations-navigator);
  /* Holds the first heading's margin inside the band, like the clearfix on OG's container. */
  display: flow-root;
  position: relative;
  padding-block-end: var(--gutter);
  background-color: var(--color-recommendations-bg);
  color: var(--color-text);
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gutter);

  /* OG's col-sm-6: the columns stack below 768px. */
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.column {
  min-inline-size: 0;
  background: none;
}

.body {
  padding-block-start: var(--space-recommendations-help);
}

/* OG's alert sat in the posters row, which kept 20px above it. */
.notice {
  padding-block-start: var(--gutter);
}

/* OG's `.posters` kept no margin under the last row. */
.cards {
  margin-block-end: calc(-1 * var(--gutter));
  animation: fade-in var(--transition-card) ease-out;
}

/* OG's `h4` under the title: a gray Hide with a small ban turned a quarter. */
.hide-line {
  display: block;
  margin-block-start: var(--space-card-subtitle);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
  line-height: var(--line-height-card-subtitle);
}

.hide {
  display: inline-block;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-recommendations-hide);
  font: inherit;

  &:is(:hover, :focus-within) {
    color: var(--color-recommendations-hide-hover);
  }
}

.hide-icon {
  display: inline-block;
  font-size: var(--font-size-recommendations-hide-icon);
  margin-inline-end: var(--space-xs-inline);
  rotate: 90deg;
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
