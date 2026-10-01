<!--
  The progress page's view: the subnav with the type dropdown, the summary strip, sort, view toggles and filters,
  then one row a show, or a poster grid when grid view is on. It sorts, filters, pages and totals `items` itself, so
  the same view renders live data (`ProgressPage.svelte`) and the design page's samples. `items` is null while the
  library is still loading. The grid view and simple bar toggles save to the viewer's settings for the tab (Watched
  and Dropped share `watched`), and grid view reloads the page, as OG did.
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
import Spinner from '$lib/components/loading/Spinner.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import UnderProgress from '$lib/components/media/UnderProgress.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import barsProgress from '$lib/icons/thin/bars-progress.svg?raw';
import grid2 from '$lib/icons/thin/grid-2.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import { settingsRequest } from '$lib/settings/settingsRequest';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { changeProgressView } from './changeProgressView.ts';
import { filterProgress } from './filterProgress.ts';
import type { loadProgress } from './loadProgress.ts';
import { hideOptionsFor, type ProgressHide } from './progressHide.ts';
import type { ProgressItem } from './ProgressItem.ts';
import ProgressRow from './ProgressRow.svelte';
import { type ProgressSort, progressSortLabel, progressSorts } from './progressSort.ts';
import ProgressSummary from './ProgressSummary.svelte';
import { isProgressType, type ProgressType, progressTypes } from './progressTypes.ts';
import { sortProgress } from './sortProgress.ts';
import { sumProgressTotals } from './sumProgressTotals.ts';
import { toProgressRow } from './toProgressRow.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadProgress>> & { profile: ProfileUser; user: HeaderUser | null };
  /** Every show on the tab, unsorted. Null while the library loads. */
  items: readonly ProgressItem[] | null;
  /** `?list=`'s shows. Null while they load. */
  listed?: ReadonlySet<number> | null;
  /** Shows whose catalog is being read. */
  expanding?: ReadonlySet<number>;
  /** A row opened its seasons. */
  onexpand?: (id: number) => void;
  /** The current page's shows, so their posters can load first. */
  onvisible?: (ids: readonly number[]) => void;
  now?: Date;
};

const { data, items, listed, expanding = new Set(), onexpand, onvisible, now = new Date() }: Props = $props();

// OG's `per(50)`, 48 in grid view (eight rows of six).
const PER_PAGE = 50;
const GRID_PER_PAGE = 48;

const base = $derived(`/users/${data.profile.slug}/progress`);
const title = $derived(`${data.profile.displayName}'s show ${data.type} progress`);
const types = Object.keys(progressTypes).filter(isProgressType);
// Dropped computes and renders as Watched.
const kind = $derived(progressTypes[data.type].kind);
const listFilter = $derived(data.list !== undefined);
const settingsGroup = $derived(progressTypes[data.type].settings);
const seed = Math.floor(Math.random() * 2 ** 31);

const shown = $derived(
  items && (!listFilter || listed)
    ? sortProgress(
      filterProgress(items, { hide: data.hide, terms: data.terms, listed: listed ?? undefined }),
      data.sort,
      seed,
    )
    : null,
);
const limit = $derived(data.grid ? GRID_PER_PAGE : PER_PAGE);
const pageCount = $derived(Math.max(Math.ceil((shown?.length ?? 0) / limit), 1));
const current = $derived(Math.min(data.page, pageCount));
const onPage = $derived(shown?.slice((current - 1) * limit, current * limit) ?? []);
const rows = $derived(
  onPage.map((item) => toProgressRow({ item, type: data.type, datePreferences: data.datePreferences, now })),
);
const totals = $derived(shown ? sumProgressTotals(shown) : null);
const meta = $derived({ type: 'paginated' as const, current, total: pageCount });

$effect(() => {
  onvisible?.(onPage.map(({ show }) => show.id));
});

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

// OG reloaded the page on each toggle. Turning Completed off also drops the Up Next link's `?hide_completed=true`, or
// it would stay hidden.
function changeHide(hide: ProgressHide[]) {
  const url = new URL(page.url);
  url.searchParams.delete('page');
  if (!hide.includes('completed')) url.searchParams.delete('hide_completed');
  // The same page with other filters; resolve() only takes route ids.
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  void goto(url.pathname + url.search, { invalidateAll: true, noScroll: true });
}
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
    <span class="strip"><ProgressSummary type={kind} shows={shown?.length ?? 0} {totals} /></span>
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
      <FadeHideMenu value={{ fade: [], hide: data.hide }} options={[]} hideOptions={hideOptionsFor(kind)}
        cookie="progress" variant="default" onchange={(next) => changeHide(next.hide)} />
    </span>
  {/snippet}
</SectionToolbar>

<section class="phone-strip" aria-label="Progress totals">
  <Container>
    <ProgressSummary type={kind} shows={shown?.length ?? 0} {totals} />
  </Container>
</section>

<!-- OG's `showLoading()` while grid view saves and the page reloads. -->
<LoadingOverlay visible={saving === 'grid_view'} />

<section class={['progress', data.type]} aria-label={title} aria-busy={shown === null}>
  <Container>
    {#if shown === null}
      <div class="loading"><Spinner label="Loading your progress" /> <span aria-hidden="true">Loading your progress…</span></div>
    {:else if rows.length > 0}
      {#if pageCount > 1}<Pagination {meta} label="Progress pages" />{/if}
      {#if data.grid}
        <div class="grid">
          <PosterGrid columns={6}>
            {#each rows as row (row.id)}
              {@const state = overlay.state('show', row.id)}
              {@const done = `${row.percent}% ${kind === 'watched' ? 'watched' : 'collected'}`}
              <PosterCard href={row.href} title={row.title} image={row.poster} rewatching={Boolean(row.rewatchingSince)}
                userRating={state.rating}
                subtitles={[row.percent === 100 ? `${done}!` : done]}
                icons={{
                  fill: quickIconFill({ state, airedEpisodes: row.aired, datePreferences: data.datePreferences }),
                  ratingTarget: { type: 'show', id: row.id, title: row.title },
                  watchTarget: { type: 'show', id: row.id, title: row.title, airedEpisodes: row.aired },
                  watchNow: 'play',
                }}>
                {#snippet progress()}
                  <UnderProgress href={row.href} percent={row.percent} lines={[[{ text: done }]]} />
                {/snippet}
              </PosterCard>
            {/each}
          </PosterGrid>
        </div>
      {:else}
        {#each rows as row (row.id)}
          <ProgressRow {row} type={data.type} {simple}
            expanding={expanding.has(row.id)} onexpand={() => onexpand?.(row.id)} />
        {/each}
      {/if}
      {#if pageCount > 1}<Pagination {meta} label="Progress pages" />{/if}
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

.empty {
  padding-block-start: var(--line-height-computed);
}

.loading {
  display: flex;
  gap: var(--space-xs-inline);
  align-items: center;
  margin-block: var(--progress-row-margin);
  color: var(--color-text-muted);
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
