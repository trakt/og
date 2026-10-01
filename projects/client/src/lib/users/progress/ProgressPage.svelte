<!--
  `/users/:id/progress(/:type)(/:sort_by/:sort_how)` under the profile frame: the
  subnav with the type dropdown, the summary strip, sort, view toggles and filters, then one row a show with its tick
  bar, seasons and next episode, or the on-deck grid when the viewer turned grid view on.
  The grid view and simple bar toggles save to the viewer's own settings for the tab (Watched and Dropped share
  `watched`), and grid view reloads the page, as OG did. On your own profile, rows reload after a watch or a rewatch
  and leave as a drop or hide saves. Dropped is your own profile only, and renders as Watched narrowed to the shows
  you dropped.
-->
<script lang="ts">
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { goto, invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import LoadingOverlay from '$lib/components/loading/LoadingOverlay.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import { watchNowTiles } from '$lib/components/filters/watchNowFilter';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import OnDeckCard from '$lib/components/media/OnDeckCard.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import UnderProgress from '$lib/components/media/UnderProgress.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import WatchNowChips from '$lib/components/watchnow/WatchNowChips.svelte';
import WatchNowFilter from '$lib/components/watchnow/WatchNowFilter.svelte';
import { favoriteSlugs } from '$lib/components/watchnow/watchNow';
import Icon from '$lib/icons/Icon.svelte';
import barsProgress from '$lib/icons/thin/bars-progress.svg?raw';
import grid2 from '$lib/icons/thin/grid-2.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import { settingsRequest } from '$lib/settings/settingsRequest';
import type { ViewerSettings } from '$lib/settings/ViewerSettings';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { changeProgressView } from './changeProgressView.ts';
import { createProgressRemovals } from './createProgressRemovals.svelte.ts';
import { fetchProgressRow } from './fetchProgressRow.ts';
import type { loadProgress } from './loadProgress.ts';
import { hideOptionsFor, type ProgressHide } from './progressHide.ts';
import ProgressRow from './ProgressRow.svelte';
import { type ProgressSort, progressSortLabel, progressSorts } from './progressSort.ts';
import ProgressSummary from './ProgressSummary.svelte';
import { isProgressType, type ProgressType, progressTypes } from './progressTypes.ts';
import { type ProgressRow as ProgressRowView, toProgressRow } from './toProgressRow.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadProgress>> & {
    profile: ProfileUser;
    user: HeaderUser | null;
    settings: ViewerSettings | null;
  };
};

const { data }: Props = $props();

const base = $derived(`/users/${data.profile.slug}/progress`);
const title = $derived(`${data.profile.displayName}'s show ${data.type} progress`);
const onDeck = $derived(new Map(data.onDeck.map((item) => [item.showId, item])));
const types = $derived(
  Object.keys(progressTypes).filter(isProgressType).filter((type) => data.isSelf || !progressTypes[type].ownOnly),
);
// Dropped reads and renders as Watched.
const kind = $derived(progressTypes[data.type].kind);
const listFilter = $derived(page.url.searchParams.has('list'));
const settingsGroup = $derived(progressTypes[data.type].settings);

// The toggles show the new state as they save; grid view then reloads the page for its layout and page size.
let simple = $derived(data.simple);
let gridOn = $derived(data.grid);
let saving = $state<'simple_progress' | 'grid_view' | null>(null);

async function toggleView(view: 'simple_progress' | 'grid_view') {
  if (saving) return;
  saving = view;
  try {
    const on = view === 'grid_view' ? !gridOn : !simple;
    const saved = await changeProgressView({
      view,
      settings: settingsGroup,
      on,
      apply: (value) => {
        if (view === 'grid_view') gridOn = value;
        else simple = value;
      },
      request: settingsRequest(authenticatedFetch({ manager: userManager() })),
      notify: toast,
    });
    // The layout's settings feed every later load, so they're read again either way.
    if (saved) await invalidateAll();
  } finally {
    saving = null;
  }
}

// Rows a drop or hide took off, back if the save fails.
const removals = createProgressRemovals<number>();
const rows = $derived(data.rows.filter((row) => !removals.has(row.id)));
const savedProgress = $derived(data.settings?.browsing?.progress?.[settingsGroup]);
const autoRefresh = $derived(Boolean(savedProgress?.refresh));

/** Your own row again (`fetchProgressRow`). A rewatch also undrops the show, so it loses its "Dropped on". */
async function refresh(row: ProgressRowView, { rewatched }: { rewatched: boolean }): Promise<ProgressRowView> {
  const fresh = await fetchProgressRow({
    fetch: authenticatedFetch({ manager: userManager() }),
    slug: data.profile.slug,
    type: kind,
    show: { id: row.id, title: row.title },
    // The same next episode the page picked.
    lastActivity: savedProgress?.use_last_activity ? settingsGroup : undefined,
  });
  const mapped = toProgressRow({ row: fresh, type: kind, datePreferences: data.datePreferences, now: new Date() });
  return { ...mapped, droppedOn: rewatched ? undefined : row.droppedOn };
}

// OG's `link_params`: the query string without the page. A new type drops the sort, like OG's type links.
function href(type: ProgressType, sort?: Pick<ProgressSort, 'by' | 'how'>) {
  const query = new SvelteURLSearchParams(page.url.searchParams);
  query.delete('page');
  const path = sort ? `/${type}/${sort.by}/${sort.how}` : type === 'watched' ? '' : `/${type}`;
  return `${base}${path}${query.size ? `?${query}` : ''}`;
}

function withTerms(terms: string) {
  const url = new URL(page.url);
  url.searchParams.delete('page');
  if (terms) url.searchParams.set('terms', terms);
  else url.searchParams.delete('terms');
  return url.pathname + url.search;
}

// OG reloaded the page on each toggle (`global.js:5641-5651`). Turning Completed off also drops the Up Next link's
// `?hide_completed=true`, or it would stay hidden.
function changeHide(hide: ProgressHide[]) {
  const url = new URL(page.url);
  url.searchParams.delete('page');
  if (!hide.includes('completed')) url.searchParams.delete('hide_completed');
  // The same page with other filters; resolve() only takes route ids.
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  void goto(url.pathname + url.search, { invalidateAll: true, noScroll: true });
}

const country = $derived(data.settings?.browsing?.watchnow?.country?.toLowerCase() || 'us');
const favorites = $derived(data.settings?.browsing?.watchnow?.favorites ?? []);
const tiles = $derived(
  watchNowTiles({
    watchnow: data.watchnow?.split(',') ?? [],
    sources: data.filterSources,
    country,
    favorites: favoriteSlugs(favorites, country, country),
  }),
);
</script>

<!-- Filter URLs keep the canonical profile slug and the query string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out {data.profile.firstName}'s show {data.type} progress." />
</svelte:head>

{#snippet viewToggle(label: string, svg: string, view: 'simple_progress' | 'grid_view', on: boolean)}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button type="button" class={['view-toggle', { selected: on }]} aria-label={label} aria-pressed={on}
        aria-busy={saving === view} onclick={() => toggleView(view)} {...tooltip}><Icon {svg} /></button>
    {/snippet}
  </Tooltip>
{/snippet}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{progressTypes[data.type].label}{/snippet}
      <ul>
        <li class="header" role="presentation">Shows</li>
        {#each types as type (type)}
          <li><a href={href(type)} aria-current={data.type === type ? 'page' : undefined}>{progressTypes[type].label}</a
            ></li>
        {/each}
      </ul>
    </Dropdown>
  {/snippet}
  {#snippet summary()}
    <span class="strip"><ProgressSummary type={kind} shows={data.total} totals={data.totals} /></span>
    <span class="sort">
      <Dropdown>
        {#snippet trigger()}{#if data.sort.supported}{progressSortLabel(data.sort.by, data.type)}{:else}{progressSortLabel(
              data.sort.by,
              data.type,
            )} <em>(unsupported)</em>{/if}{/snippet}
        <ul>
          {#each Object.keys(progressSorts) as by (by)}
            <li><a href={href(data.type, { by, how: data.sort.how })}
              aria-current={data.sort.by === by ? 'page' : undefined}>{progressSortLabel(by, data.type)}</a></li>
          {/each}
        </ul>
      </Dropdown>
      <SortDirection bind:flipped={
        () => data.sort.how === 'desc',
        (next) => goto(href(data.type, { by: data.sort.by, how: next ? 'desc' : 'asc' }))
      } />
    </span>
    <span class="icons">
      {#if data.user}
        {@render viewToggle('Grid View', grid2, 'grid_view', gridOn)}
        {@render viewToggle('Simple Progress Bars', barsProgress, 'simple_progress', simple)}
      {/if}
      <TermsFilter vip={data.user?.isVip ?? false} bind:terms={() => data.terms, (terms) => goto(withTerms(terms))} />
      <WatchNowFilter value={data.watchnow} {country} {favorites} />
      <FadeHideMenu value={{ fade: [], hide: data.hide }} options={[]} hideOptions={hideOptionsFor(kind)}
        cookie="progress" variant="default" onchange={(next) => changeHide(next.hide)} />
    </span>
  {/snippet}
</SectionToolbar>

<section class="phone-strip" aria-label="Progress totals">
  <Container>
    <ProgressSummary type={kind} shows={data.total} totals={data.totals} />
  </Container>
</section>

<WatchNowChips {tiles} />

<!-- OG's `showLoading()` while grid view saves and the page reloads. -->
<LoadingOverlay visible={saving === 'grid_view'} />

<section class={['progress', data.type]} aria-label={title}>
  <Container>
    {#if data.rows.length > 0}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Progress pages" />{/if}
      {#if data.grid}
        <div class="grid">
          <PosterGrid columns={6}>
            {#each data.rows as row (row.id)}
              {@const item = onDeck.get(row.id)}
              {#if item}
                <OnDeckCard {item} state={overlay.state('episode', item.episodeId)} />
              {:else}
                {@const state = overlay.state('show', row.id)}
                <PosterCard href={row.href} title={row.title} image={row.poster} rewatching={Boolean(row.rewatchingSince)}
                  userRating={state.rating}
                  subtitles={[`100% ${kind === 'watched' ? 'watched' : 'collected'}!`]}
                  icons={{
                    fill: quickIconFill({ state, airedEpisodes: row.aired, datePreferences: data.datePreferences }),
                    rating: row.next.rating,
                    ratingTarget: { type: 'show', id: row.id, title: row.title },
                    watchTarget: { type: 'show', id: row.id, title: row.title, airedEpisodes: row.aired },
                    watchNow: 'play',
                  }}>
                  {#snippet cover()}
                    {#if row.next.tags.at(0)}<span class="poster-label">{row.next.tags.at(0)?.text}</span>{/if}
                  {/snippet}
                  {#snippet progress()}
                    <UnderProgress href={row.href} percent={100}
                      lines={[[{ text: `100% ${kind === 'watched' ? 'watched' : 'collected'}` }]]} />
                  {/snippet}
                </PosterCard>
              {/if}
            {/each}
          </PosterGrid>
        </div>
      {:else}
        {#each rows as row (row.id)}
          <ProgressRow {row} type={kind} {simple} isSelf={data.isSelf} datePreferences={data.datePreferences}
            refresh={data.isSelf ? refresh : undefined} {autoRefresh}
            onremove={(saved) => void removals.track(row.id, saved)} />
        {/each}
      {/if}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Progress pages" />{/if}
    {:else}
      <div class="empty">
        {#if listFilter}
          <NoData>Add some TV shows to your list and they'll start showing up here.</NoData>
        {:else}
          <NoData />
        {/if}
      </div>
    {/if}
  </Container>
</section>

<style>
.sort,
.icons {
  display: flex;
  align-items: center;
}

.icons {
  gap: var(--history-icon-gap);
}

.view-toggle {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-filter-icon);
  font-size: var(--font-size-filter-icon);
  line-height: 1;
  vertical-align: middle;
  cursor: pointer;
  transition: color 0.5s;

  &.selected {
    color: var(--brand-primary);
  }
}

.progress {
  display: flow-root;
  padding-block-end: var(--space-panel);

  /* The top pagination spacing and -bottom. */
  & :global(nav) {
    margin-block: var(--line-height-computed);
  }
}

.grid {
  margin-block: var(--progress-row-margin);
}

/* OG's `h4.bottom` over a poster. */
.poster-label {
  position: absolute;
  inset-block-end: var(--poster-label-bottom);
  inset-inline-start: var(--poster-label-start);
  padding: var(--poster-label-padding);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-poster-label);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
}

.empty {
  padding-block-start: var(--line-height-computed);
}

/* On a phone OG moved the strip to its own band under the subnav (`.list-stats-wrapper.visible-xs-block`). */
.phone-strip {
  display: none;
  padding-block: var(--toolbar-padding);
  background: var(--color-toolbar-bg);
  border-block-start: 1px solid var(--color-separator);
}

@media (width < 768px) {
  .strip {
    display: none;
  }

  .phone-strip {
    display: block;

    & :global(.progress-summary) {
      justify-content: flex-start;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .view-toggle {
    transition: none;
  }
}
</style>
