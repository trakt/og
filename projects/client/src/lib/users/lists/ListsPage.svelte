<!--
  `/users/:id/lists` and `/users/:id/lists/collaborations` under the profile frame: the subnav
  with the type menu, the owner's add and reorder buttons, the count, sort, direction and search, then the watchlist and
  favorites rows over a rule and every list as a list row. Sorting and searching run in the browser, like OG's isotope
  grid, and the choice goes into the query string.
-->
<script lang="ts">
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import type { ReportTarget } from '$lib/components/summary/ReportTarget';
import { leaveList } from '$lib/components/lists/leaveList';
import { resolveRowListId } from '$lib/users/lists/resolveRowListId';
import { tick } from 'svelte';
import { flip } from 'svelte/animate';
import { prefersReducedMotion } from 'svelte/motion';
import { SvelteMap } from 'svelte/reactivity';
import { slide } from 'svelte/transition';
import { goto, invalidateAll, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import ListReorderControls from '$lib/components/lists/ListReorderControls.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import ListEditor from '$lib/components/lists/ListEditor.svelte';
import { deleteList } from '$lib/components/lists/deleteList';
import { overlay } from '$lib/overlay/overlay';
import ListRow from '$lib/components/media/ListRow.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import addCircle from '$lib/icons/trakt/add-circle.svg?raw';
import listIcon from '$lib/icons/trakt/list.svg?raw';
import move from '$lib/icons/trakt/move.svg?raw';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { nearViewport } from '$lib/utils/nearViewport';
import type { Collaborator } from './Collaborator.ts';
import { fetchCollaborators } from './fetchCollaborators.ts';
import { listRowActions } from './listRowActions.ts';
import type { ListsQuery } from './ListsQuery.ts';
import type { loadLists } from './loadLists.ts';
import { matchesListTerms } from './matchesListTerms.ts';
import { sortsFor } from './sortsFor.ts';
import { toListsSearch } from './toListsSearch.ts';
import type { UserListRow } from './UserListRow.ts';
import { moveList } from '$lib/users/lists/moveList';
import { saveListOrder } from '$lib/users/lists/saveListOrder';
import { visibleLists } from './visibleLists.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadLists>> & { profile: ProfileUser; isSelf: boolean; user: HeaderUser | null };
};

const { data }: Props = $props();
const personal = $derived(data.mode === 'personal');
const title = $derived(`${data.profile.displayName}'s ${personal ? 'personal lists' : 'collaborations'}`);
const base = $derived(`/users/${data.profile.slug}/lists`);
const sorts = $derived(sortsFor(data.mode));

// The loader parsed the URL once; after that the controls own the view and write it back to the URL.
// svelte-ignore state_referenced_locally
let query = $state<ListsQuery>({ ...data.query });
let shuffled = $state<readonly string[]>([]);

let order = $state<readonly UserListRow[] | null>(null);
let reordering = $state(false);
let busy = $state(false);
let dragging = $state<string | null>(null);
let dragRank = $state<number | null>(null);
let rowsElement = $state<HTMLDivElement>();
let addButton = $state<HTMLButtonElement>();
const left = new SvelteMap<number, boolean>();
let reportTarget = $state<ReportTarget | null>(null);
let reportOpen = $state(false);
const allLists = $derived(
  (order ?? data.lists).filter((row) =>
    !removed.includes(row.id ?? -1) && (personal || !data.isSelf || row.id === null || !left.get(row.id))
  ),
);
const canReorder = $derived(data.isSelf && personal && Boolean(data.user) && data.listsComplete);
const lists = $derived(reordering ? allLists : visibleLists(allLists, query, shuffled));
// New loader data replaces the page-scoped optimistic order (never persisted or shared between SSR requests).
$effect(() => {
  void data.lists;
  void data.user;
  order = null;
  left.clear();
  reportOpen = false;
  reportTarget = null;
  reordering = false;
  dragging = null;
});
const toggleReorder = () => {
  if (!canReorder || busy || dragging || deleting !== null) return;
  reordering = !reordering;
};
const shortcut = () => {
  const keydown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'r' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable], dialog, [role="dialog"]')
    ) return;
    if (!canReorder) return;
    event.preventDefault();
    toggleReorder();
  };
  window.addEventListener('keydown', keydown);
  return () => window.removeEventListener('keydown', keydown);
};
async function moveRow(list: UserListRow, rank: number) {
  if (!canReorder || !reordering || busy) return;
  const source = data.lists;
  const before = allLists;
  const next = moveList({ rows: before, key: list.key, rank });
  if (next === before) return;
  order = next;
  busy = true;
  await tick();
  const element = rowsElement?.querySelector<HTMLElement>(`[data-list-key="${list.key}"]`);
  element?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion.current ? 'instant' : 'smooth' });
  const ok = await saveListOrder({
    rank: next.flatMap(({ id }) => id === null ? [] : [id]),
    request: (path, body) =>
      rawApiFetch({
        fetch: authenticatedFetch({ manager: userManager() }),
        path,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      }),
    notify: toast,
  });
  if (!ok && source === data.lists) order = before;
  busy = false;
}
function startDrag(list: UserListRow, event: PointerEvent) {
  if (busy || !reordering || event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
  event.preventDefault();
  event.currentTarget.focus();
  event.currentTarget.setPointerCapture(event.pointerId);
  dragging = list.key;
  dragRank = list.rank;
}
const dragEvents = (element: HTMLDivElement) => {
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    if (event.clientY < 100) window.scrollBy(0, -20);
    if (event.clientY > window.innerHeight - 100) window.scrollBy(0, 20);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-list-key]');
    const row = allLists.find(({ key }) => key === target?.dataset.listKey);
    if (row) dragRank = row.rank;
  };
  const end = (event: PointerEvent) => {
    const list = allLists.find(({ key }) => key === dragging);
    const rank = dragRank;
    dragging = null;
    dragRank = null;
    if (event.type !== 'pointercancel' && list && rank !== null) void moveRow(list, rank);
  };
  const cancel = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !dragging) return;
    event.preventDefault();
    dragging = null;
    dragRank = null;
  };
  window.addEventListener('keydown', cancel);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
  return () => {
    window.removeEventListener('keydown', cancel);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end);
  };
};
let editor = $state<{ id: number | null }>();
let removed = $state<readonly number[]>([]);
let deleting = $state<number | null>(null);
const limit = $derived(page.data.settings?.limits?.list?.count);
async function removeList(row: UserListRow) {
  if (row.id === null || deleting !== null || busy || reordering) return;
  const id = row.id;
  deleting = id;
  const ok = await deleteList({
    id,
    overlay,
    notify: toast,
    request: (path, method) =>
      rawApiFetch({ fetch: authenticatedFetch({ manager: userManager() }), path, init: { method } }),
    remove: () => {
      removed = [...removed, id];
      return () => {
        removed = removed.filter((value) => value !== id);
      };
    },
  });
  deleting = null;
  if (ok) {
    void overlay.refresh();
    await invalidateAll();
    addButton?.focus({ preventScroll: true });
  }
}
const builtIns = $derived(data.builtIns.filter((row) => matchesListTerms(row, query.terms)));
const sortName = $derived(sorts.find(({ id }) => id === query.sort)?.label);
// OG's isotope moved rows over 0.4s and slid the watchlist and favorites rows up and down.
const duration = $derived(prefersReducedMotion.current ? 0 : 400);

// Isotope's shuffle, dealt fresh each time Random is picked. The server renders rank order, so a reload on Random
// shuffles once it's in the browser.
const shuffle = () => {
  const keys = data.lists.map(({ key }) => key);
  shuffled = keys.reduce<string[]>((deck, key, i) => deck.toSpliced(Math.floor(Math.random() * (i + 1)), 0, key), []);
};
$effect(() => {
  if (query.sort === 'random' && shuffled.length === 0) shuffle();
});

$effect(() => {
  const search = toListsSearch(query, data.mode);
  if (search === page.url.search) return;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- the same page, with only its query changed
  replaceState(`${page.url.pathname}${search}${page.url.hash}`, page.state);
});

const pick = (sort: ListsQuery['sort']) => {
  if (sort === 'random') shuffle();
  query = { ...query, sort };
};

// The "N collaborators" pill, one request a list as its row nears the viewport. Public lists go without the token, so
// the worker's cache answers; the rest need the viewer's.
const collaborators = new SvelteMap<number, readonly Collaborator[]>();
const loadCollaborators = (row: UserListRow) => () => {
  if (row.id === null || collaborators.has(row.id)) return;
  const id = row.id;
  const fetch = row.isPublic || !data.user ? globalThis.fetch : authenticatedFetch({ manager: userManager() });
  fetchCollaborators({ fetch, listId: id }).then((found) => collaborators.set(id, found));
};

const viewer = $derived(data.user ? { slug: data.user.slug, isVip: data.user.isVip } : null);
async function progress(row: UserListRow) {
  if (!data.user?.isVip) return;
  const source = data;
  try {
    const id = await resolveRowListId({ fetch: authenticatedFetch({ manager: userManager() }), row });
    if (data !== source) return;
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- canonical OG progress URL with its list query
    await goto(`/users/${data.user.slug}/progress?list=${id}`);
  } catch {
    if (data === source) toast.error('Doh! We could not open list progress. Please try again.');
  }
}
async function report(row: UserListRow) {
  const source = data;
  try {
    const id = await resolveRowListId({ fetch: authenticatedFetch({ manager: userManager() }), row });
    if (data !== source) return;
    reportTarget = {
      type: 'list',
      id,
      title: row.name,
      href: row.href,
      ownerSlug: row.kind === 'personal' ? row.owner.slug : undefined,
    };
    reportOpen = true;
  } catch {
    if (data === source) toast.error('Doh! We could not open the list report. Please try again.');
  }
}
async function leave(row: UserListRow) {
  if (row.id === null || !data.user || left.has(row.id)) return;
  const source = data;
  const id = row.id;
  const ok = await leaveList({
    fetch: authenticatedFetch({ manager: userManager() }),
    id,
    viewer: data.user.slug,
    patch: () => {
      left.set(id, true);
      return () => {
        if (data === source) left.delete(id);
      };
    },
    notify: (message) => {
      if (data === source) toast.error(message);
    },
  });
  if (ok && data === source) toast.success('You stopped collaborating on this list.');
}
const actions = (row: UserListRow) => {
  const names = row.id === null ? [] : collaborators.get(row.id) ?? [];
  // On your own collaborations tab every list is one you collaborate on.
  const isCollaborator = (!personal && data.isSelf) || names.some(({ slug }) => slug === viewer?.slug);
  const result = listRowActions({
    row,
    viewer,
    isCollaborator: isCollaborator && !left.get(row.id ?? 0),
    origin: page.url.origin,
  });
  return {
    ...result,
    ...(result.edit && row.id !== null && {
      edit: {
        onclick: () => {
          editor = { id: row.id };
        },
      },
    }),
    ...(result.delete && {
      delete: {
        onclick: () => removeList(row),
        busy: deleting !== null || busy || reordering,
        warning: limit !== undefined && data.lists.length > limit
          ? `You're over the ${limit} list limit. You won't be able to re-create this list if you delete it.`
          : "This can't be undone!",
      },
    }),
    ...(result.progress && {
      progress: {
        onclick: () => {
          void progress(row);
        },
      },
    }),
    ...(result.report && {
      report: {
        onclick: () => {
          void report(row);
        },
      },
    }),
    ...(result.leave && {
      leave: {
        onclick: () => {
          void leave(row);
        },
      },
    }),
  };
};
</script>

<!-- Tab and list URLs keep the canonical profile slug; list pages are OG routes og hasn't built yet. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out {data.profile.firstName}'s watchlist and personal lists." />
</svelte:head>

{#snippet row(list: UserListRow, rank: number | undefined)}
  <ListRow
  href={list.href}
  name={list.name}
  owner={list.owner}
  posters={list.posters}
  itemCount={list.itemCount}
  likeCount={list.likeCount}
  likeTarget={list.id === null ? undefined : { id: list.id, ownerSlug: list.kind === 'personal' ? list.owner.slug : undefined, viewer: data.user?.slug ?? null }}
  commentCount={list.commentCount}
  pills={list.pills}
  shareLink={list.shareLink}
  collaborators={list.id === null ? [] : (collaborators.get(list.id) ?? []).filter(({ slug }) => !left.get(list.id ?? 0) || slug !== data.user?.slug).map(({ name }) => name)}
  description={list.description}
  {rank}
  actions={actions(list)}
  reorderControls={reordering ? controls : undefined}
/>
{#snippet controls()}
      <ListReorderControls name={list.name} rank={list.rank} total={allLists.length} {busy}
  onmove={(rank) => moveRow(list, rank)} ondrag={(event) => startDrag(list, event)} />
{/snippet}
{/snippet}

{#if reportTarget}<ReportDialog bind:open={reportOpen} target={reportTarget} />{/if}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{personal ? 'Personal Lists' : 'Collaborations'}{/snippet}
      <ul>
        <li class="header" role="presentation">{data.profile.firstName}'s lists</li>
        <li><a href={base} aria-current={personal ? 'page' : undefined}>Personal Lists</a></li>
        <li><a href="{base}/collaborations" aria-current={personal ? undefined : 'page'}>Collaborations</a></li>
      </ul>
    </Dropdown>
    {#if data.isSelf && personal}
      <!-- Add list is wired by. -->
      <span class="owner-tools">
        <button bind:this={addButton} type="button" class="tool add" disabled={busy || reordering || deleting !== null} onclick={() => { editor = { id: null }; }}><Icon svg={addCircle} /><span>Add list</span></button>
        <button type="button" class="tool reorder" class:active={reordering} aria-pressed={reordering} aria-keyshortcuts="r" disabled={!canReorder || busy || Boolean(dragging)} onclick={toggleReorder}><Icon svg={move} /><span>Reorder</span></button>
      </span>
    {/if}
  {/snippet}
  {#snippet summary()}
    <Tooltip text="Lists">
      {#snippet trigger(tooltip)}
        <span class="count" {...tooltip}>
          <Icon svg={listIcon} />
          {lists.length.toLocaleString('en-US')}
          <span class="count-text">{lists.length === 1 ? 'list' : 'lists'}</span>
        </span>
      {/snippet}
    </Tooltip>
    <span class="sort" inert={reordering}>
      <Dropdown>
        {#snippet trigger()}{reordering ? 'Rank' : sortName}{/snippet}
        <ul>
          {#each sorts as sort (sort.id)}
            <li>
              <button type="button" aria-current={sort.id === query.sort} onclick={() => { if (!reordering) pick(sort.id); }} aria-disabled={reordering}>{sort.label}</button>
            </li>
          {/each}
        </ul>
      </Dropdown>
      {#if reordering}<SortDirection flipped={false} />{:else}<SortDirection bind:flipped={query.reversed} />{/if}
      <TermsFilter bind:terms={query.terms} vip={(data.user?.isVip ?? false) && !reordering} />
    </span>
  {/snippet}
</SectionToolbar>

{#if editor}<ListEditor id={editor.id} onclose={() => { editor = undefined; }} />{/if}

<section class="lists" aria-labelledby="lists-heading" {@attach shortcut}>
  <Container>
    <h2 id="lists-heading" class="visually-hidden">{title}</h2>
    {#if personal && !reordering && data.builtIns.length > 0}
      {#each builtIns as list (list.key)}
        <div transition:slide={{ duration }}>{@render row(list, undefined)}</div>
      {/each}
      {#if builtIns.length > 0}<hr transition:slide={{ duration }} />{/if}
    {/if}
    <div class="rows" bind:this={rowsElement} {@attach dragEvents} aria-busy={busy}>
      {#each lists as list (list.key)}
        <div data-list-key={list.key} class:dragging={dragging === list.key} class:drop-target={dragging !== null && dragRank === list.rank} out:slide={{ duration }} animate:flip={{ duration }} {@attach nearViewport(loadCollaborators(list))}>
          {@render row(list, personal ? list.rank : undefined)}
        </div>
      {/each}
    </div>
    {#if !personal && data.lists.length === 0}
      <div class="empty"><NoData /></div>
    {/if}
  </Container>
</section>

<style>
.lists {
  padding-block-end: var(--gutter);
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

hr {
  margin-block: var(--gutter) 0;
}

.empty {
  padding-block-start: var(--gutter);
}

.owner-tools {
  display: inline-flex;
  align-items: center;
  gap: var(--list-tools-gap);
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  text-transform: uppercase;
  cursor: default;

  & :global(.icon) {
    font-size: var(--font-size-list-row-action);
  }
}

.add {
  color: var(--color-list-add);
}

.reorder {
  color: var(--color-list-reorder);
}

.reorder {
  cursor: pointer;
}
.reorder.active {
  color: var(--brand-primary);
}
.reorder:disabled {
  cursor: default;
}
.reorder:focus-visible {
  outline: var(--list-reorder-rank-border) solid var(--color-input-border-focus);
}
.rows > div {
  scroll-margin-block-start: calc(var(--header-height) + var(--list-reorder-scroll-offset));
}
.dragging {
  opacity: var(--list-reorder-drag-opacity);
}
.drop-target {
  outline: var(--list-reorder-rank-border) solid var(--brand-primary);
}

.count {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--brand-secondary);
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  text-transform: uppercase;

  & :global(.icon) {
    font-size: var(--font-size-list-row-action);
  }
}

.sort {
  display: inline-flex;
  align-items: center;
}

@media (width < 992px) {
  .count-text {
    display: none;
  }
}
</style>
