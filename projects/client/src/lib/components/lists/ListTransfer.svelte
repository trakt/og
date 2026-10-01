<script lang="ts">
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { tick } from 'svelte';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { login } from '$lib/auth/login';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { overlay } from '$lib/overlay/overlay';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import { loadListCatalog } from '$lib/components/lists/loadListCatalog';
import { sortPickerLists } from '$lib/components/lists/sortPickerLists';
import type { PickerList } from '$lib/components/lists/PickerList';
import { fetchListItemRefs } from '$lib/lists/fetchListItemRefs';
import { transferListItems } from '$lib/lists/transferListItems';
import type { ListView } from '$lib/lists/toListView';
import type { ListQuery } from '$lib/lists/ListQuery';
import type { ListSort } from '$lib/lists/resolveListSort';
import Icon from '$lib/icons/Icon.svelte';
import close from '$lib/icons/trakt/delete-thick.svg?raw';
import search from '$lib/icons/solid/magnifying-glass.svg?raw';
import dot from '$lib/icons/trakt/dot.svg?raw';
import friends from '$lib/icons/trakt/friends.svg?raw';
import arrow from '$lib/icons/solid/angle-right.svg?raw';
import spinner from '$lib/icons/solid/arrows-rotate.svg?raw';

interface Props {
  source: ListView;
  query: ListQuery;
  sort: ListSort;
  count: number;
  move?: boolean;
  svg: string;
  busy?: boolean;
  managing?: boolean;
  onbusychange?: (busy: boolean) => void;
}
const {
  source,
  query,
  sort,
  count,
  move = false,
  svg,
  busy: otherBusy = false,
  managing = false,
  onbusychange = () => {},
}: Props = $props();
const id = $props.id();
const label = $derived(move ? 'Move' : 'Copy');
let triggerButton = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let input = $state<HTMLInputElement>();
let expanded = $state(false);
let busy = $state(false);
let searching = $state(false);
let terms = $state('');
let lists = $state<PickerList[]>([]);
let watchlistCount = $state(0);
let pending = $state<number | null>(null);
let failed = $state<number | null>(null);
let created = $state<Parameters<typeof transferListItems>[0]['destination']>(null);
const rows = $derived(sortPickerLists(lists.filter((list) => list.id !== source.id), searching ? terms : ''));
const listLimit = $derived(page.data.settings?.limits?.list);
const watchLimit = $derived(page.data.settings?.limits?.watchlist?.item_count);
const hasWatchlist = $derived(!(source.kind === 'watchlist' && source.ownerSlug === page.data.user?.slug));
$effect(() => {
  void source.id;
  created = null;
  popover?.hidePopover();
});
const authFetch = () => authenticatedFetch({ manager: userManager() });
const request = (path: string, body: unknown) =>
  rawApiFetch({
    fetch: authFetch(),
    path,
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });
const read = (target: NonNullable<Parameters<typeof transferListItems>[0]['destination']>) =>
  fetchListItemRefs({
    fetch: authFetch(),
    base: target.watchlist
      ? '/users/me/watchlist'
      : `/users/${encodeURIComponent(target.owner)}/lists/${target.id}/items`,
    query: { types: [], genres: [] },
    sort: { by: 'rank', how: 'asc' },
  });
async function open() {
  if (busy || otherBusy) return;
  if (!page.data.user) {
    await login();
    return;
  }
  if (!page.data.user.isVip) {
    globalThis.location.assign('/vip/list-management');
    return;
  }
  busy = true;
  onbusychange(true);
  try {
    const [catalog, watchlist] = await Promise.all([
      loadListCatalog(authFetch()),
      hasWatchlist ? read({ id: 0, name: 'Watchlist', owner: 'me', watchlist: true }) : [],
    ]);
    lists = catalog;
    watchlistCount = watchlist.length;
    searching = false;
    terms = '';
    failed = null;
    popover?.showPopover();
  } catch {
    toast.error("Doh! We couldn't load your lists. Please try again.");
  } finally {
    busy = false;
    onbusychange(false);
  }
}
async function transfer(list: PickerList | null, watchlist = false) {
  if (busy || otherBusy) return;
  const selectedSource = source;
  const selectedQuery = query;
  const selectedSort = sort;
  const row = watchlist ? -1 : list?.id ?? 0;
  const limit = watchlist ? watchLimit : listLimit?.item_count;
  const total = watchlist ? watchlistCount : list?.count ?? 0;
  if (limit !== undefined && (list || watchlist) && total >= limit) {
    failed = row;
    toast.error(
      `Your ${watchlist ? 'watchlist' : `${list?.name} list`} already has ${limit.toLocaleString('en-US')} items.`,
    );
    return;
  }
  if (
    !list && !watchlist && !created && listLimit &&
    lists.filter((item) => !item.collaboration).length >= listLimit.count
  ) {
    toast.error(`You've already created ${listLimit.count.toLocaleString('en-US')} lists.`);
    return;
  }
  busy = true;
  onbusychange(true);
  pending = row;
  failed = null;
  try {
    const base = selectedSource.kind === 'official'
      ? `/lists/${selectedSource.id}/items`
      : selectedSource.kind === 'personal'
      ? `/users/${encodeURIComponent(selectedSource.ownerSlug)}/lists/${selectedSource.id}/items`
      : `/users/${encodeURIComponent(selectedSource.ownerSlug)}/${selectedSource.kind}`;
    const items = await fetchListItemRefs({ fetch: authFetch(), base, query: selectedQuery, sort: selectedSort });
    if (
      !list && !watchlist && !created && limit !== undefined &&
      items.filter((item) => item.type !== 'person').length > limit
    ) {
      toast.error(`A new list can only have ${limit.toLocaleString('en-US')} items.`);
      failed = row;
      return;
    }
    const result = await transferListItems({
      source: selectedSource,
      sort: selectedSort,
      items,
      move,
      destination: watchlist
        ? { id: 0, owner: 'me', name: 'Watchlist', watchlist: true }
        : list
        ? { id: list.id, owner: list.owner, name: list.name }
        : created,
      request,
      read,
      overlay,
      notify: toast,
    });
    if (!list && !watchlist && source.id === selectedSource.id) created = result.target;
    if (!result.ok) {
      failed = row;
      void overlay.refresh();
      return;
    }
    popover?.hidePopover();
    toast.success(
      `${move ? 'Moved' : 'Copied'} ${result.count.toLocaleString('en-US')} ${
        result.count === 1 ? 'item' : 'items'
      } on ${selectedSource.name} to this list!${
        result.skipped
          ? ` ${result.skipped} ${
            result.skipped === 1 ? 'person was' : 'people were'
          } left out because people can't be added to lists.`
          : ''
      }`,
    );
    await goto(
      result.target.watchlist
        ? resolve('/users/[id]/watchlist', { id: page.data.user?.slug ?? 'me' })
        : resolve('/lists/[id=listId]', { id: String(result.target.id) }),
      {
        invalidateAll: true,
      },
    );
    void overlay.refresh();
  } catch {
    failed = row;
    toast.error('Doh! We ran into some sort of error.');
  } finally {
    busy = false;
    onbusychange(false);
    pending = null;
  }
}
async function searchToggle() {
  searching = !searching;
  terms = '';
  await tick();
  if (searching) input?.focus();
}
function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector<HTMLButtonElement>('button')?.focus();
  else triggerButton?.focus({ preventScroll: true });
}
</script>
<!-- Canonical list and VIP URLs are shared by personal, official and built-in lists. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<span class="control" class:managing style:anchor-name="--transfer-{id}">
  <Tooltip text="{label} items into another list">
    {#snippet trigger(tooltip)}
      <button bind:this={triggerButton} type="button" class="trigger" aria-label="{label} items into another list" disabled={busy || otherBusy} aria-busy={busy}
        aria-haspopup="dialog" aria-expanded={expanded} aria-controls="transfer-{id}" {...tooltip} onclick={open}>
        <Icon {svg} /><span class="text">{label}</span>
      </button>
    {/snippet}
  </Tooltip>
</span>
<div bind:this={popover} id="transfer-{id}" class="picker" popover="auto" role="dialog"
  aria-label="{label} items into a list"
  aria-busy={busy} style:position-anchor="--transfer-{id}" ontoggle={toggle}>
  <header><span>{label} <b>{count.toLocaleString('en-US')}</b> {count === 1 ? 'item' : 'items'} into...</span>
    <div class="tools"><button aria-label="Filter by title" aria-pressed={searching} onclick={searchToggle}><Icon svg={search} /></button><button aria-label="Close list picker" onclick={() => popover?.hidePopover()}><Icon svg={close} /></button></div>
  </header>
  {#if searching}<div class="search"><input bind:this={input} aria-label="Search lists" placeholder="Search term..." bind:value={terms} /></div>{/if}
  <ul>
    {@render row(null, 'New List', 0, '', undefined, false)}
    {#if hasWatchlist}{@render row(null, 'Watchlist', watchlistCount, '', `/users/${page.data.user?.slug}/watchlist`, true)}{/if}
    {#each rows as list, i (list.id)}{@render row(list, list.name, list.count, list.privacy, `/lists/${list.id}`, false, i === 0)}{/each}
  </ul>
</div>
{#snippet row(list: PickerList | null, name: string, total: number, privacy: string, href?: string, watchlist = false, divider = false)}
  {@const rowId = watchlist ? -1 : list?.id ?? 0}
  {@const limit = watchlist ? watchLimit : list ? listLimit?.item_count : undefined}
  <li class:divider class:maxed={limit !== undefined && total >= limit} class:pending={pending === rowId}
  class:error={failed === rowId}
  title={href ? `${total.toLocaleString('en-US')} ${total === 1 ? 'item' : 'items'}` : undefined}>
    <button type="button" class="row" disabled={busy || otherBusy} onclick={() => transfer(list, watchlist)}>
      <Icon svg={pending === rowId ? spinner : list?.collaboration ? friends : dot} />
      <span>{name}{#if privacy && privacy !== 'public'}<span class="privacy">{privacy}</span>{/if}</span>
    </button>
    {#if href}<a {href} target="_blank" rel="noopener" aria-label="View {name}"><Icon svg={arrow} /></a>{/if}
  </li>
{/snippet}
<style>
.control {
  display: inline-flex;
}
.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--list-manage-icon-gap);
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-list-row-action);
  line-height: 1;
}
.text {
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  font-weight: var(--font-weight-headings-light);
  text-transform: uppercase;
}
button:focus-visible,
a:focus-visible {
  outline: var(--list-border) solid var(--color-input-border-focus);
  outline-offset: var(--list-border);
}
.picker {
  position: fixed;
  inset: auto;
  position-area: bottom;
  position-try-fallbacks: flip-block, flip-inline;
  inline-size: var(--list-transfer-width);
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--list-transfer-gap) 0 0;
  padding: 0;
  overflow: visible;
  border: var(--list-border) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-rating-popover);
  font: var(--list-row-size) / var(--line-height-base) var(--font-body);
}
.picker::before {
  content: '';
  position: absolute;
  inset-block-end: 100%;
  inset-inline-start: calc(50% - var(--rating-arrow-size));
  border: var(--rating-arrow-size) solid transparent;
  border-block-end-color: var(--color-rating-prompt);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--list-header-block) var(--rating-popover-body-inline);
  background: var(--color-rating-prompt);
  border-block-end: var(--list-border) solid var(--color-menu-divider);
  border-radius: var(--radius-rating-popover) var(--radius-rating-popover) 0 0;
  font: var(--font-size-base) / var(--list-transfer-header-line) var(--font-headings);
}
.tools {
  display: flex;
  gap: var(--space-xs-inline);
}
.tools button {
  border: 0;
  padding: 0;
  min-block-size: 0;
  background: none;
  color: var(--color-text-muted);
  line-height: 1;
}
.tools button[aria-pressed='true'] {
  color: var(--brand-primary);
}
ul {
  margin: 0;
  padding: var(--rating-popover-body-block) 0 calc(var(--rating-popover-body-block) +
    var(--list-transfer-list-padding));
  max-block-size: var(--list-scroll-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  margin-block-start: var(--list-row-gap);
}
li.divider {
  margin-block-start: var(--list-transfer-divider-gap);
  padding-block-start: var(--list-transfer-divider-gap);
  border-block-start: var(--list-border) solid var(--color-menu-divider);
}
li.pending {
  color: var(--brand-secondary);
}
li.error {
  color: var(--brand-danger);
}
li.maxed .row {
  text-decoration: line-through;
}
.row {
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--space-xs-inline);
  padding: 0 0 0 var(--space-sm-inline);
  border: 0;
  min-block-size: 0;
  background: none;
  color: inherit;
  text-align: start;
  font: inherit;
}
.row > :global(.icon) {
  flex: 0 0 var(--list-row-icon);
}
.privacy {
  display: inline-block;
  margin-inline-start: var(--space-xs-inline);
  padding: var(--space-xs-block) var(--list-privacy-inline);
  background: var(--color-text-muted);
  color: var(--color-text-inverse);
  border-radius: var(--radius-sm);
  font: var(--list-privacy-size) / var(--line-height-base) var(--font-headings);
  text-transform: uppercase;
}
li a {
  padding-inline: var(--space-base-inline);
  opacity: var(--list-link-opacity);
  color: inherit;
}
li a:is(:hover, :focus-visible) {
  opacity: 1;
}
.search {
  padding: var(--space-sm-inline);
  background: var(--color-rating-prompt);
}
.search input {
  inline-size: 100%;
}
@media (width < 992px) {
  .control:not(.managing) .text {
    display: none;
  }
}
@media (width < 768px) {
  .managing .text {
    display: none;
  }
}
.pending :global(.icon) {
  animation: spin var(--list-spinner-duration) linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pending :global(.icon) {
    animation: none;
  }
}
</style>
