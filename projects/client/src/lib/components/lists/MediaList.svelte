<script lang="ts">
import { page } from '$app/state';
import { tick } from 'svelte';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { login } from '$lib/auth/login';
import { overlay } from '$lib/overlay/overlay';
import { toast } from '$lib/components/toast/toast.svelte';
import { listCatalog } from '$lib/components/lists/listCatalog.svelte';
import { syncPickerOverlay } from '$lib/components/lists/syncPickerOverlay';
import { loadPickerLists } from '$lib/components/lists/loadPickerLists';
import { sortPickerLists } from '$lib/components/lists/sortPickerLists';
import { toggleListItem } from '$lib/components/lists/toggleListItem';
import { createList } from '$lib/components/lists/createList';
import { loadFollowerCandidates } from '$lib/components/lists/loadFollowerCandidates';
import NewListDialog from '$lib/components/lists/NewListDialog.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import type { ListTarget } from '$lib/components/lists/ListTarget';
import type { PickerList } from '$lib/components/lists/PickerList';
import Icon from '$lib/icons/Icon.svelte';
import listIcon from '$lib/icons/trakt/list.svg?raw';
import listThick from '$lib/icons/trakt/list-thick.svg?raw';
import plus from '$lib/icons/light/circle-plus.svg?raw';
import add from '$lib/icons/trakt/add-thick.svg?raw';
import close from '$lib/icons/trakt/delete-thick.svg?raw';
import search from '$lib/icons/solid/magnifying-glass.svg?raw';
import dot from '$lib/icons/trakt/dot.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import friends from '$lib/icons/trakt/friends.svg?raw';
import friendsThick from '$lib/icons/trakt/friends-thick.svg?raw';
import arrow from '$lib/icons/solid/angle-right.svg?raw';
import spinner from '$lib/icons/solid/arrows-rotate.svg?raw';
interface Props {
  target: ListTarget;
  variant?: 'summary' | 'card';
  small?: boolean;
}
const { target, variant = 'card', small = false }: Props = $props();
const id = $props.id();
let triggerButton = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let searchInput = $state<HTMLInputElement>();
let expanded = $state(false);
let busy = $state(false);
let loaded = $state(false);
let pendingRow = $state<number | null>(null);
let lists = $state<PickerList[]>([]);
let watchlisted = $state(false);
let terms = $state('');
let searching = $state(false);
let newList = $state(false);
let createError = $state('');
let serverLimit = $state<number>();
let following = $state<{ slug: string; name: string; avatar?: string }[]>([]);
let followingError = $state(false);
const viewerState = $derived(overlay.state(target.type, target.id));
const selected = $derived(Boolean(viewerState.watchlisted || viewerState.listed));
const rows = $derived(sortPickerLists(lists, searching ? terms : ''));
const count = $derived(lists.filter((list) => list.selected).length);
const hasWatchlist = $derived(target.type !== 'person');
const watchlistCount = $derived(overlay.watchlistCount());
const watchlistMode = $derived(
  hasWatchlist &&
    ((loaded ? lists.length : listCatalog.count(page.data.user?.slug ?? '') ?? 0) === 0 ||
      page.data.settings?.browsing?.list_popup_action === 'watchlist'),
);
const label = $derived(selected ? 'Listed On' : watchlistMode ? 'Add to watchlist' : 'Add to list');
const subtitle = $derived(
  loaded
    ? [watchlisted ? 'Watchlist' : '', count ? `${count} ${count === 1 ? 'list' : 'lists'}` : ''].filter(Boolean).join(
      ' + ',
    )
    : viewerState.watchlisted
    ? 'Watchlist'
    : viewerState.listed
    ? 'Personal lists'
    : '',
);
const listLimit = $derived(page.data.settings?.limits?.list);
const max = $derived(
  serverLimit ??
    (listLimit && lists.filter((list) => !list.collaboration).length >= listLimit.count ? listLimit.count : undefined),
);
let pressedAt = 0;
let longPressed = false;
const authFetch = () => authenticatedFetch({ manager: userManager() });
const request = (path: string, body: unknown) =>
  rawApiFetch({
    fetch: authFetch(),
    path,
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });

$effect(() => {
  if (variant === 'summary' && page.data.user) void listCatalog.load(page.data.user.slug, authFetch()).catch(() => {});
});

async function load() {
  const result = await loadPickerLists({ fetch: authFetch(), target });
  lists = result.lists;
  listCatalog.update(page.data.user?.slug ?? '', lists.length);
  watchlisted = result.watchlisted ?? Boolean(viewerState.watchlisted);
  loaded = true;
  syncPickerOverlay({ overlay, target, listed: lists.some((list) => list.selected), watchlisted });
}
async function open(force = false) {
  if (busy) return;
  if (!(await userManager().getUser())?.access_token) {
    await login();
    return;
  }
  busy = true;
  try {
    await load();
    if (!force && watchlistMode && !selected) {
      await toggleWatchlist();
      return;
    }
    if (!force && lists.length === 0 && hasWatchlist) {
      await toggleWatchlist();
      return;
    }
    popover?.togglePopover();
  } catch {
    toast.error("Doh! We couldn't load your lists. Please try again.");
  } finally {
    busy = false;
  }
}
async function toggleWatchlist() {
  const before = watchlisted;
  watchlisted = !before;
  const ok = await toggleListItem({ target, list: null, remove: before, overlay, request, notify: toast });
  if (!ok) watchlisted = before;
}
async function toggleRow(list?: PickerList) {
  if (busy) return;
  busy = true;
  pendingRow = list?.id ?? 0;
  try {
    if (!list) {
      await toggleWatchlist();
      return;
    }
    lists = lists.map((row) =>
      row.id === list.id ? { ...row, selected: !row.selected, count: row.count + (row.selected ? -1 : 1) } : row
    );
    const ok = await toggleListItem({
      target,
      list,
      remove: list.selected,
      stillListed: lists.some((row) => row.selected),
      overlay,
      request,
      notify: toast,
    });
    if (!ok) lists = lists.map((row) => row.id === list.id ? list : row);
  } finally {
    busy = false;
    pendingRow = null;
  }
}
function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector<HTMLButtonElement>('button')?.focus();
  else if (!newList) {
    triggerButton?.focus({ preventScroll: true });
    void overlay.refresh();
  }
}
async function searchToggle() {
  searching = !searching;
  terms = '';
  await tick();
  if (searching) searchInput?.focus();
}
async function openNew() {
  createError = '';
  serverLimit = undefined;
  followingError = false;
  newList = true;
  popover?.hidePopover();
  try {
    following = await loadFollowerCandidates(authFetch());
  } catch {
    followingError = true;
  }
}
async function save(draft: Parameters<typeof createList>[0]['draft'] & { collaborators: string[] }) {
  if (busy) return;
  busy = true;
  try {
    const { collaborators, ...fields } = draft;
    const created = await createList({ request, draft: fields });
    const row: PickerList = {
      id: created.ids.trakt,
      name: created.name,
      count: created.item_count,
      privacy: created.privacy,
      rank: 0,
      owner: page.data.user?.slug ?? 'me',
      collaboration: false,
      selected: false,
    };
    lists = [row, ...lists];
    listCatalog.update(page.data.user?.slug ?? '', lists.length);
    const added = await toggleListItem({ target, list: row, remove: false, overlay, request, notify: toast });
    if (added) {
      lists = lists.map((list) => list.id === row.id ? { ...list, selected: true, count: list.count + 1 } : list);
    }
    const collaborations = await Promise.all(
      collaborators.map((slug) =>
        request(`/lists/${row.id}/collaborators/${encodeURIComponent(slug)}`, {}).then((response) => response.ok).catch(
          () => false,
        )
      ),
    );
    if (collaborations.some((ok) => !ok)) {
      toast.error('List created, but some collaborators could not be added. Collaborators must follow you.');
    }
    toast.success(`You created ${created.name}.${added ? '' : ' Retry adding this item in the picker.'}`);
    newList = false;
    popover?.showPopover();
  } catch (error) {
    if (error instanceof Error && error.message === '420') serverLimit = listLimit?.count ?? lists.length;
    else createError = 'Could not create the list. Check the name and try again.';
  } finally {
    busy = false;
  }
}
</script>
<!-- Picker links use list ids and the viewer's canonical slug. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class={['list-control', variant, { small, selected, expanded }]} style:anchor-name="--list-{id}">
  <Tooltip text={variant === 'card' ? selected ? 'Manage lists' : label : undefined}>
    {#snippet trigger(tooltip)}
  <button bind:this={triggerButton} type="button" class="trigger" aria-label={variant === 'card' && selected ? 'Manage lists' : label} aria-haspopup="dialog" aria-expanded={expanded} aria-controls="list-{id}" aria-busy={busy} disabled={busy} {...tooltip}
    onpointerdown={() => { pressedAt = Date.now(); longPressed = false; }}
    onpointerup={() => { longPressed = Date.now() - pressedAt >= 500; }}
    aria-keyshortcuts="ArrowDown"
    onkeydown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); void open(true); } }}
    onclick={() => open(longPressed)}>
    <Icon svg={variant === 'card' ? listThick : listIcon} fixedWidth />
    {#if variant === 'summary'}<span class="text"><span class="label">{label}</span>{#if subtitle}<span class="subtitle">{subtitle}</span>{/if}</span>{/if}
    {#if busy}<span class="spinner"><Icon svg={spinner} /></span>{/if}
  </button>
    {/snippet}
  </Tooltip>
  {#if variant === 'summary'}
    <Tooltip text="Add to list" placement="right">
      {#snippet trigger(tooltip)}
        <button type="button" class="side" aria-label="Add to list" aria-haspopup="dialog" aria-controls="list-{id}" disabled={busy} onclick={() => open(true)} {...tooltip}><Icon svg={plus} /></button>
      {/snippet}
    </Tooltip>
  {/if}
</div>
<div bind:this={popover} id="list-{id}" class={['picker', variant]} popover="auto" role="dialog"
  aria-label="Lists for {target.title}" style:position-anchor="--list-{id}" ontoggle={toggle}>
  <header><span>Listed on <b>{count + Number(hasWatchlist && watchlisted)}</b> of {lists.length + Number(hasWatchlist)} lists</span>
    <div class="tools"><button aria-label="Filter by title" aria-pressed={searching} onclick={searchToggle}><Icon svg={search} /></button><button aria-label="Add to new list" onclick={openNew}><Icon svg={add} /></button><button aria-label="Close list picker" onclick={() => popover?.hidePopover()}><Icon svg={close} /></button></div>
  </header>
  {#if searching}<div class="search"><input bind:this={searchInput} aria-label="Search lists" placeholder="Search term..." bind:value={terms} /></div>{/if}
  {#if hasWatchlist || rows.length > 0}<ul>
    {#if hasWatchlist && (!searching || 'watchlist'.includes(terms.toLowerCase()))}
      {@render row(null, 'Watchlist', watchlisted, watchlistCount, '', `/users/${page.data.user?.slug ?? 'me'}/watchlist`, page.data.settings?.limits?.watchlist?.item_count)}
    {/if}
    {#each rows as list (list.id)}{@render row(list, list.name, list.selected, list.count, list.privacy, `/lists/${list.id}`, listLimit?.item_count)}{/each}
  </ul>{/if}
  {#if !hasWatchlist && lists.length === 0}<p class="empty">Click <Icon svg={add} /> to add to a new list</p>{/if}
  {#if searching && rows.length === 0 && (!hasWatchlist || !'watchlist'.includes(terms.toLowerCase()))}<p class="empty">No matching lists.</p>{/if}
</div>
{#snippet row(list: PickerList | null, name: string, active: boolean, total: number, privacy: string, href: string, limit?: number)}
  {@const maxed = limit !== undefined && total >= limit && !active}
  <!-- OG's item count tooltip, on the left (global.js, lists.js). It describes the row's toggle for screen readers. -->
  <li class:active class:maxed class:pending={pendingRow === (list?.id ?? 0)}>
  <Tooltip text="{total.toLocaleString('en-US')} {total === 1 ? 'item' : 'items'}" placement="left">
      {#snippet trigger({ 'aria-describedby': describedby, ...tooltip })}
        <div class="row" {...tooltip}>
          <button type="button" class="row-toggle" aria-pressed={active} aria-describedby={describedby}
            disabled={busy || maxed} onclick={() => toggleRow(list ?? undefined)}>
            <Icon
              svg={pendingRow === (list?.id ?? 0) ? spinner : list?.collaboration ? active ? friendsThick : friends : active ? check : dot} />
            <span>{name}{#if privacy && privacy !== 'public'}<span class="privacy">{privacy === 'friends' ? 'following' : privacy}</span>{/if}</span>
          </button>
          <a {href} target="_blank" rel="noopener" aria-label="View {name}"><Icon svg={arrow} /></a>
        </div>
      {/snippet}
    </Tooltip>
</li>
{/snippet}
{#if newList}<NewListDialog title="Add to new list" bind:open={newList} {busy} error={createError} {max}
  avatar={page.data.user?.avatarUrl}
  vip={page.data.user?.isVip} {following} {followingError}
  onclose={async () => { await tick(); triggerButton?.focus({ preventScroll: true }); }}
  onsave={save} />{/if}
<style>
.list-control {
  display: flex;
  position: relative;
  color: var(--brand-fifth);
}
.trigger {
  display: flex;
  align-items: center;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}
.card {
  --bar: var(--list-card-height);
  --width: var(--list-card-width);
}
.card.small {
  --bar: var(--list-card-small-height);
  --width: var(--list-card-small-width);
}
.card .trigger {
  justify-content: center;
  inline-size: var(--width);
  block-size: var(--bar);
  font-size: var(--font-size-quick-icon);
}
.card.small .trigger {
  font-size: var(--font-size-quick-icon-small);
}
.card.selected,
.card:has(.trigger:is(:hover, :focus-visible)) {
  background: var(--brand-fifth);
  color: var(--color-text-inverse);
}
/* The picker carries the variant class too, so the trigger's own rules name .list-control. */
.list-control.summary {
  border: var(--list-border) solid var(--brand-secondary);
  background: var(--color-action-bg);
  color: var(--brand-secondary);
  min-block-size: calc(var(--action-height) + 2 * var(--list-border));
}
.summary .trigger {
  flex: 1;
  text-align: start;
}
.summary .trigger > :global(.icon) {
  inline-size: var(--action-icon-width);
  padding-inline: var(--space-xs-inline);
  font-size: var(--font-size-action-icon);
}
.text {
  flex: 1;
  padding-block: var(--space-lg-block);
}
.label {
  display: block;
  font: var(--font-size-action) / var(--list-action-line) var(--font-headings);
  text-transform: uppercase;
}
.subtitle {
  display: block;
  font: var(--font-size-small) / var(--list-subtitle-line) var(--font-headings);
}
.text:has(.subtitle) .label {
  line-height: var(--list-selected-line);
}
.side {
  align-self: stretch;
  padding: 0 var(--list-side-inline);
  border: 0;
  background: var(--color-action-side-bg);
  color: var(--color-action-side);
  font-size: var(--font-size-large);
}
.list-control.summary.selected,
.list-control.summary.expanded,
.list-control.summary:has(button:is(:hover, :focus-visible)) {
  background: var(--brand-secondary);
  color: var(--color-text-inverse);
}
.selected .side,
.expanded .side {
  color: var(--color-text-inverse);
}
button:focus-visible,
a:focus-visible {
  outline: var(--list-border) solid var(--color-input-border-focus);
  outline-offset: var(--list-border);
}
.spinner {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-action-bg);
  color: var(--brand-secondary);
}
.spinner :global(.icon) {
  animation: spin var(--list-spinner-duration) linear infinite;
}
.pending .row-toggle :global(.icon) {
  animation: spin var(--list-spinner-duration) linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.picker {
  position: fixed;
  inset: auto;
  position-area: bottom;
  position-try-fallbacks: flip-block, flip-inline;
  inline-size: var(--list-picker-width);
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--list-picker-gap) 0 0;
  padding: 0;
  overflow: visible;
  border: var(--list-border) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-rating-popover);
  font: var(--list-row-size) / var(--line-height-base) var(--font-body);
}
.picker.summary {
  inline-size: anchor-size(width);
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
  padding: var(--list-header-block) var(--space-sm-inline);
  background: var(--color-rating-prompt);
  border-block-end: var(--list-border) solid var(--color-menu-divider);
  border-radius: var(--radius-rating-popover) var(--radius-rating-popover) 0 0;
  font-family: var(--font-headings);
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
  padding: var(--space-sm-inline) 0;
  max-block-size: var(--list-scroll-height);
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}
li {
  margin-block-start: var(--list-row-gap);
}
.row {
  display: flex;
  align-items: center;
}
li.active {
  color: var(--brand-secondary);
}
li.maxed .row-toggle {
  text-decoration: line-through;
}
.row-toggle {
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
.row-toggle > :global(.icon) {
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
.active .privacy {
  background: var(--brand-secondary);
}
li a {
  padding-inline: var(--space-base-inline);
  opacity: var(--list-link-opacity);
  color: inherit;
}
li a:is(:hover, :focus-visible) {
  opacity: 1;
}
.empty {
  margin: 0;
  padding: var(--space-sm-inline);
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
}
.search {
  padding: var(--space-sm-inline);
  background: var(--color-rating-prompt);
}
.search input {
  inline-size: 100%;
}
@media (prefers-reduced-motion: reduce) {
  .spinner :global(.icon),
  .pending .row-toggle :global(.icon) {
    animation: none;
  }
}
</style>
