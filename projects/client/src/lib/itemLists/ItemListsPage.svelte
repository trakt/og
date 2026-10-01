<!--
  The lists featuring a movie, show, season, episode or person: the subpage frame,
  a subnav with the type dropdown on the left and the sort dropdown on the right, then 30 list rows a page with
  pagination above and below, or OG's empty notice. The 30-day sorts and the direction arrow have no API.
-->
<script lang="ts">
import { page } from '$app/state';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import ListRow from '$lib/components/media/ListRow.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SubpageFrame from '$lib/components/summary/SubpageFrame.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import listThick from '$lib/icons/trakt/list-thick.svg?raw';
import { countLabel } from '$lib/utils/countLabel';
import {
  type ItemListQuery,
  itemListsHref,
  type ItemListSortBy,
  itemListSorts,
  type ItemListType,
  itemListTypes,
} from './itemListQuery.ts';
import { itemListRowActions } from './itemListRowActions.ts';
import type { loadItemLists } from './loadItemLists.ts';

const { data }: { data: Awaited<ReturnType<typeof loadItemLists>> } = $props();
const typeLabel = $derived(itemListTypes[data.query.type].label);
// OG's `humanize`: "Personal lists featuring Fight Club (1999)".
const title = $derived(
  `${typeLabel.charAt(0)}${typeLabel.slice(1).toLowerCase()} featuring ${data.media.item.title}`,
);
const first = $derived(data.lists.at(0));
const description = $derived(first ? [first.name, first.description].filter(Boolean).join(' - ') : title);
const href = (next: Partial<ItemListQuery>) => itemListsHref(data.media.href, { ...data.query, ...next });
const types = Object.keys(itemListTypes) as ItemListType[];
const sorts = Object.keys(itemListSorts) as ItemListSortBy[];
// Pagination renders nothing for one page.
const pages = $derived(data.page && data.page.total > 1 ? data.page : null);
const viewer = $derived(data.user ? { slug: data.user.slug, isVip: data.user.isVip } : null);
</script>

<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  {#if data.media.poster}<meta property="og:image" content={data.media.poster} />{/if}
</svelte:head>

{#snippet sortLabel(by: ItemListSortBy)}
  {@const sort = itemListSorts[by]}
  {sort.label}{#if 'note' in sort}&nbsp;<em>({sort.note})</em>{/if}
{/snippet}

<!-- The item links are the canonical API slugs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#snippet subnav()}
  <SectionToolbar inSummary>
    {#snippet filters()}
      <Dropdown>
        {#snippet trigger()}{typeLabel}&nbsp;{/snippet}
        <ul>
          {#each types as type (type)}
            <li>
              <a href={href({ type })} aria-current={data.query.type === type ? 'page' : undefined}>
                {itemListTypes[type].label}
              </a>
            </li>
          {/each}
        </ul>
      </Dropdown>
    {/snippet}
    {#snippet summary()}
      <Dropdown>
        {#snippet trigger()}{@render sortLabel(data.query.sortBy)}&nbsp;{/snippet}
        <ul>
          {#each sorts as sortBy (sortBy)}
            <li>
              <a href={href({ sortBy })} aria-current={data.query.sortBy === sortBy ? 'page' : undefined}>
                {@render sortLabel(sortBy)}
              </a>
            </li>
          {/each}
        </ul>
      </Dropdown>
    {/snippet}
  </SectionToolbar>
{/snippet}

<SubpageFrame
  {...data}
  label="{typeLabel} featuring..."
  icon={listThick}
  sections={[{ label: countLabel(data.count, 'list'), href: '#lists' }]}
  {subnav}
>
  <!-- Each row brings OG's 20px above it, so rows straight under the subnav sit flush like OG's. -->
  <div id="lists" class={['lists', { flush: data.lists.length > 0 && !pages }]}>
    {#if data.lists.length === 0}
      <NoData>No lists featuring this {data.kind} yet.</NoData>
    {:else}
      {#if pages}<div class="pages-top"><Pagination meta={pages} label="Lists pages" /></div>{/if}
      {#each data.lists as list (list.id)}
        <ListRow {...list} likeTarget={{ id: list.id, ownerSlug: list.kind === 'personal' ? list.owner.slug : undefined, viewer: page.data.user?.slug ?? null }} actions={itemListRowActions({ list, viewer, origin: page.url.origin })} />
      {/each}
      {#if pages}<div class="pages-bottom"><Pagination meta={pages} label="Lists pages" /></div>{/if}
    {/if}
  </div>
</SubpageFrame>

<style>
.lists {
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  &.flush {
    margin-block-start: calc(-1 * var(--gutter));
  }
}

/* OG's `.pagination-top` and `.pagination-bottom`: 20px between the pages and the rows. */
.pages-top {
  margin-block-end: var(--gutter);
}

.pages-bottom {
  margin-block: var(--gutter);
}
</style>
