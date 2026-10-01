<script lang="ts">
import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { tick } from 'svelte';
import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import SubnavCount from '$lib/components/toolbar/SubnavCount.svelte';
import InlineNotice from '$lib/components/notice/InlineNotice.svelte';
import RestoreCard from '$lib/components/media/RestoreCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import { overlay } from '$lib/overlay/overlay';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { login } from '$lib/auth/login';
import { toast } from '$lib/components/toast/toast.svelte';
import documentIcon from '$lib/icons/trakt/document.svg?raw';
import pointer from '$lib/icons/solid/hand-pointer.svg?raw';
import { hiddenSections } from '$lib/users/hidden/hiddenSections';
import { hiddenItemsPage } from '$lib/users/hidden/hiddenItemsPage';
import { restoreHiddenItem } from '$lib/users/hidden/restoreHiddenItem';
import type { loadHidden } from '$lib/users/hidden/loadHidden';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
const { data }: { data: Awaited<ReturnType<typeof loadHidden>> & { user: HeaderUser | null } } = $props();
const selected = $derived(hiddenSections[data.type]);
let sort = $derived<'title' | 'date'>(page.url.searchParams.get('sort') === 'date' ? 'date' : 'title');
let flipped = $derived(page.url.searchParams.get('sort_how') === 'desc');
let terms = $derived(page.url.searchParams.get('terms') ?? '');
const removed = new SvelteSet<string>();
const busy = new SvelteSet<string>();
let grid = $state<HTMLElement>();
$effect(() => {
  if (!data.items) return;
  removed.clear();
  busy.clear();
});
const results = $derived(
  hiddenItemsPage({
    items: data.items.filter((item) => !removed.has(item.key)),
    sort,
    flipped,
    terms,
    current: Number(page.url.searchParams.get('page')) || 1,
  }),
);
function href(type: string, changes: Record<string, string | null> = {}) {
  const query = new SvelteURLSearchParams(page.url.searchParams);
  query.delete('page');
  Object.entries(changes).forEach(([key, value]) => value === null ? query.delete(key) : query.set(key, value));
  return `/settings/hidden${type === 'dropped' ? '' : `/${type}`}${query.size ? `?${query}` : ''}`;
}
async function restore(item: typeof data.items[number]) {
  if (busy.has(item.key)) return;
  busy.add(item.key);
  if (!(await userManager().getUser())?.access_token) {
    busy.delete(item.key);
    return login();
  }
  const source = data.items;
  const buttons = [...(grid?.querySelectorAll<HTMLButtonElement>('article button') ?? [])];
  const active = document.activeElement;
  const index = buttons.findIndex((button) => button === active);
  removed.add(item.key);
  const saving = restoreHiddenItem({
    item,
    type: data.type,
    overlay,
    notify: toast,
    request: (path, body) =>
      rawApiFetch({
        path,
        fetch: authenticatedFetch({ manager: userManager() }),
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      }),
  });
  await tick();
  ([...buttons.slice(index + 1), ...buttons.slice(0, index).toReversed()].find((button) => button.isConnected) ?? grid)
    ?.focus({ preventScroll: true });
  const saved = await saving;
  if (source !== data.items) return;
  if (!saved) removed.delete(item.key);
  busy.delete(item.key);
}
</script>
<!-- Dynamic section links preserve the filter query. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>Hidden Items - Trakt</title>
  <meta name="description" content="Manage your hidden shows, movies, seasons and blocked comment authors." />
</svelte:head>
<SettingsHeader />
<div class="toolbar">
  <SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{#if selected.shows}<span class="alt">Shows:</span> {/if}{selected.label}{/snippet}
      <ul><li class="header">Shows</li>{#each Object.entries(hiddenSections).filter(([, value]) => value.shows) as [type, value] (type)}<li><a href={href(type)} aria-current={data.type === type ? 'page' : undefined}>{value.label}</a></li>{/each}</ul>
      <hr />
      <ul><li class="header">Sections</li>{#each Object.entries(hiddenSections).filter(([, value]) => !value.shows) as [type, value] (type)}<li><a href={href(type)} aria-current={data.type === type ? 'page' : undefined}>{value.label}</a></li>{/each}</ul>
    </Dropdown>
  {/snippet}
  {#snippet summary()}
    <span class="count"><SubnavCount svg={documentIcon} count={results.count} noun="item" tooltip="Items" /></span>
    <Dropdown>{#snippet trigger()}{sort === 'title' ? 'Title' : 'Date'}{/snippet}<ul>{#each ['title', 'date'] as value (value)}<li><a href={href(data.type, { sort: value, terms: null })} aria-current={sort === value ? 'page' : undefined}>{value === 'title' ? 'Title' : 'Date'}</a></li>{/each}</ul></Dropdown>
    <SortDirection bind:flipped={() => flipped, (value) => { flipped = value; replaceState(href(data.type, { sort_how: value ? "desc" : "asc" }), page.state); }} />
    {#if sort === 'title'}<TermsFilter bind:terms={() => terms, (value) => { terms = value; replaceState(href(data.type, { terms: value || null }), page.state); }} vip={data.user?.isVip ?? false} />{/if}
  {/snippet}
  </SectionToolbar>
</div>
<div class="description">
  <Container>
    <p>{selected.description}</p>
  </Container>
</div>
<section bind:this={grid} class="hidden-items" aria-label={selected.label} tabindex="-1">
  <Container>
    {#if data.expired}
      <div class="empty"><NoData>Your session has expired. <a href={href(data.type)} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to manage hidden items.</NoData></div>
    {:else if results.items.length}
      <div class="hint"><InlineNotice svg={pointer}>{selected.hint}</InlineNotice></div>
      <Pagination meta={results.meta} />
      <div class="cards"><PosterGrid>
        {#each results.items as item (item.key)}<RestoreCard title={item.title} parentTitle={item.parentTitle} date={item.date} image={item.image} avatar={item.type === 'user'} busy={busy.has(item.key)} onclick={() => restore(item)} />{/each}
      </PosterGrid></div>
      <Pagination meta={results.meta} />
    {:else}<div class="empty"><NoData /></div>{/if}
  </Container>
</section>
<style>
.toolbar {
  --toolbar-padding: var(--space-lg-block);
  --toolbar-gap: 0;
}
.count {
  margin-inline-end: var(--hidden-count-gap);
}
.alt {
  margin-inline-end: var(--hidden-label-gap);
  color: var(--gray-light);
}
.description {
  background: var(--color-subnav-text-bg);
  font-size: var(--font-size-subnav-text);
}
.description p {
  margin: 0;
  padding-block: var(--subnav-text-padding);
}
.hidden-items {
  display: flow-root;
}
.hint {
  margin-block: var(--hidden-hint-start) var(--hidden-hint-end);
}
.empty {
  padding-block-start: var(--line-height-computed);
}
.cards {
  &:has(:global(button:is(:hover, :focus-visible))) :global(button:not(:hover, :focus-visible)) {
    opacity: var(--hidden-faded-opacity);
  }
}
@media (width < 768px) {
  .count {
    display: none;
  }
}
</style>
