<!--
  `/users/:id/library(/:type)(/:sort_by/:sort_how)` under the profile frame: the subnav
  with the type dropdown, date range, counter, sort and filter icons, the description band, then the owned items as
  poster cards, under day dividers on Added Date. The owner's cards carry the metadata overlay.
-->
<script lang="ts">
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import CollectionOverlay from '$lib/components/collection/CollectionOverlay.svelte';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import DateRangeFilter from '$lib/components/filters/DateRangeFilter.svelte';
import DividersToggle from '$lib/components/filters/DividersToggle.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import DayGroup from '$lib/components/history/DayGroup.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import SubnavCount from '$lib/components/toolbar/SubnavCount.svelte';
import collection from '$lib/icons/trakt/collection.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { formatRuntime } from '$lib/utils/formatRuntime';
import { historyTypes, isHistoryType } from '../history/historyTypes.ts';
import { type LibrarySort, librarySorts, sortLabels, validSort } from './librarySort.ts';
import type { loadLibrary } from './loadLibrary.ts';
import { toHistoryDays } from '$lib/users/history/toHistoryCard';
import type { LibraryCard } from './toLibraryCard.ts';

type Props = { data: Awaited<ReturnType<typeof loadLibrary>> & { profile: ProfileUser } };

const { data }: Props = $props();
let cards = $derived(data.cards);
const days = $derived(data.days.length ? toHistoryDays(cards, data.datePreferences) : []);
function remove(item: LibraryCard) {
  cards = cards.filter((card) => card.type !== item.type || card.id !== item.id);
}
const metaType = $derived(data.type === 'all' ? 'show and movie' : data.type.replace(/s$/, ''));
const title = $derived(`${data.profile.displayName}'s ${metaType} library`);
const owner = $derived(data.isSelf ? 'Your' : `${data.profile.firstName}'s`);
const noun = $derived(data.type === 'all' ? 'item' : data.type.replace(/s$/, ''));
const base = $derived(`/users/${data.profile.slug}/library`);
const screenshots = $derived(data.type === 'episodes');

// OG's `library_user_path(type, sort_by, sort_how, link_params)`: the query string without the page. A sort the
// new type doesn't have falls back to Added Date, and the default sort stays out of the path.
function href(type: string, sort: LibrarySort) {
  const query = new SvelteURLSearchParams(page.url.searchParams);
  query.delete('page');
  const kept = isHistoryType(type) && validSort(type, sort.by) ? sort : undefined;
  const path = kept && (kept.by !== 'added' || kept.how !== 'asc')
    ? `/${type}/${kept.by}/${kept.how}`
    : type === 'all'
    ? ''
    : `/${type}`;
  return `${base}${path}${query.size ? `?${query}` : ''}`;
}

let dividers = $derived(data.dividers);
let fadeHide = $derived<FadeHide>(data.fadeHide);
const fadeOptions = $derived(fadeHideOptions.filter((option) => data.type === 'shows' || !('showsOnly' in option)));
const flipped = $derived(data.sort.how === 'desc');
</script>

<!-- Filter URLs keep the canonical profile slug and the query string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out what {data.profile.firstName} has added to their library recently." />
</svelte:head>

{#snippet card(item: LibraryCard)}
  {@const state = overlay.state(item.type, item.id)}
  {@const fill = quickIconFill({ state, airedEpisodes: item.airedEpisodes, datePreferences: data.datePreferences })}
  <PosterCard
  href={item.href}
  title={item.title}
  number={item.number}
  image={item.image}
  variant={item.variant}
  episodeBadge={item.episodeBadge}
  subtitles={item.subtitles}
  userRating={state.rating}
  icons={{
        fill,
        rating: item.rating,
        ratingTarget: { type: item.type, id: item.id, title: item.title },
        watchTarget: { type: item.type, id: item.id, title: item.title, airedEpisodes: item.airedEpisodes, season: item.season },
        onCollectionRemove: data.isSelf && item.type !== 'show' ? () => remove(item) : undefined,
        watchNow: 'play',
        listLabel: item.type === 'episode' ? 'Add to list' : 'Add to watchlist',
      }}
  faded={fadeHide.fade.some((id) => matchesFadeHide(id, state, fill))}
>
    {#snippet cover()}
      {#if item.badges}<CollectionOverlay badges={item.badges} />{/if}
    {/snippet}
    {#if item.metadataLabel}<span class="visually-hidden">{item.metadataLabel}</span>{/if}
  </PosterCard>
{/snippet}

{#snippet grid(cards: readonly LibraryCard[])}
  <PosterGrid columns={screenshots ? 4 : 6}>
    {#each cards as item (`${item.type}:${item.key}`)}{@render card(item)}{/each}
  </PosterGrid>
{/snippet}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{historyTypes[data.type]}{/snippet}
      <ul>
        {#each Object.entries(historyTypes) as [type, label] (type)}
          <li><a href={href(type, data.sort)} aria-current={data.type === type ? 'page' : undefined}>{label}</a></li>
        {/each}
      </ul>
    </Dropdown>
    <DateRangeFilter start={data.range.startAt} end={data.range.endAt} label="Collected At"
      datePreferences={data.datePreferences} />
  {/snippet}
  {#snippet summary()}
    <SubnavCount svg={collection} count={data.total} {noun} tooltip={`${noun.charAt(0).toUpperCase()}${noun.slice(1)}s`} />
    <span class="sort">
      <Dropdown>
        {#snippet trigger()}{sortLabels[data.sort.by]}{/snippet}
        <ul>
          {#each librarySorts[data.type] as by (by)}
            <li><a href={href(data.type, { by, how: data.sort.how })}
              aria-current={data.sort.by === by ? 'page' : undefined}>{sortLabels[by]}</a></li>
          {/each}
        </ul>
      </Dropdown>
      <SortDirection bind:flipped={
        () => flipped,
        (next) => goto(href(data.type, { by: data.sort.by, how: next ? 'desc' : 'asc' }))
      } />
    </span>
    <span class="icons">
      {#if data.sort.by === 'added'}<DividersToggle bind:shown={dividers} />{/if}
      <FadeHideMenu value={fadeHide} options={fadeOptions} cookie="library" hideOptions={[]} variant="default"
        onchange={(next) => (fadeHide = next)} />
    </span>
  {/snippet}
</SectionToolbar>

<section class="description" aria-label="About this library">
  <Container>
    <p>{owner} {metaType} library — <em>All owned items including Blu-rays, DVDs, and digital downloads.</em></p>
  </Container>
</section>

<section class="library" aria-label={title}>
  <Container>
    {#if cards.length > 0}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Library pages" />{/if}
      {#if days.length > 0}
        {#each days as day (day.key)}
          <DayGroup weekday={day.weekday} date={day.date} divider={dividers}
            runtime={data.type === 'shows' ? undefined : formatRuntime(day.runtime)}>
            {@render grid(day.cards)}
          </DayGroup>
        {/each}
      {:else}
        {@render grid(cards)}
      {/if}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Library pages" />{/if}
    {:else}
      <div class="empty"><NoData /></div>
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

.description {
  background-color: var(--color-subnav-text-bg);
  font-size: var(--font-size-subnav-text);

  & p {
    margin: 0;
    padding-block: var(--subnav-text-padding);
  }
}

.library {
  display: flow-root;
  padding-block-end: var(--space-panel);

  /* The top pagination spacing: 20px above, the divider's own 20px below. */
  & :global(nav) {
    margin-block: var(--line-height-computed) var(--history-pagination-end);
  }
}

.empty {
  padding-block-start: var(--line-height-computed);
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
