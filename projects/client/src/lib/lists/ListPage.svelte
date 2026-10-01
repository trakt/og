<!--
  A list page under the profile frame: the subnav with the type and genre dropdowns, the sort
  and its direction, the title row with the list's pills and the viewer's icons, the description band, then the ranked
  poster grid between two paginations. The stats bar sits before the sort; the filter icons follow it. Watchlist, favorites and official lists render here too.
-->
<script lang="ts">
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import BuiltInListDialog from '$lib/components/lists/BuiltInListDialog.svelte';
import { overlay } from '$lib/overlay/overlay';
import { toast } from '$lib/components/toast/toast.svelte';
import { loadOwnerItems } from '$lib/lists/loadOwnerItems';
import { moveListItem } from '$lib/lists/moveListItem';
import { rerankListCards } from '$lib/lists/rerankListCards';
import { removeOwnerItems } from '$lib/lists/removeOwnerItems';
import { writeOwnerList } from '$lib/lists/writeOwnerList';
import { listItemRowsSchema } from '$lib/lists/listItemRowsSchema';
import { toListItemCard } from '$lib/lists/toListItemCard';
import { afterNavigate, goto, replaceState } from '$app/navigation';
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import { leaveList } from '$lib/components/lists/leaveList';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { untrack } from 'svelte';
import { flip } from 'svelte/animate';
import { prefersReducedMotion } from 'svelte/motion';
import ListEditor from '$lib/components/lists/ListEditor.svelte';
import ManageConfirm from '$lib/components/comments/ManageConfirm.svelte';
import { deleteList } from '$lib/components/lists/deleteList';
import { api } from '$lib/api/api';
import CommentText from '$lib/components/comments/CommentText.svelte';
import { parseComment } from '$lib/components/comments/text/parseComment';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import WatchNowFilter from '$lib/components/watchnow/WatchNowFilter.svelte';
import WatchNowChips from '$lib/components/watchnow/WatchNowChips.svelte';
import { favoriteSlugs } from '$lib/components/watchnow/watchNow';
import { watchNowTiles } from '$lib/components/filters/watchNowFilter';
import type { ViewerSettings } from '$lib/settings/ViewerSettings';
import { listFilterOptions } from '$lib/lists/listFilterOptions';
import NoData from '$lib/components/empty/NoData.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import ListTransfer from '$lib/components/lists/ListTransfer.svelte';
import clone from '$lib/icons/thin/clone.svg?raw';
import fileExport from '$lib/icons/thin/file-export.svg?raw';
import ListItemEdit from '$lib/components/lists/ListItemEdit.svelte';
import OfficialListHeader from '$lib/components/lists/OfficialListHeader.svelte';
import RankInput from '$lib/components/lists/RankInput.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import NotesDialog from '$lib/components/notes/NotesDialog.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import ReadMore from '$lib/components/readmore/ReadMore.svelte';
import ShareButton from '$lib/components/share/ShareButton.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import userXmark from '$lib/icons/light/user-xmark.svg?raw';
import barsProgress from '$lib/icons/thin/bars-progress.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';
import documentAdd from '$lib/icons/trakt/document-add.svg?raw';
import flag from '$lib/icons/trakt/flag-2.svg?raw';
import move from '$lib/icons/trakt/move.svg?raw';
import pencil from '$lib/icons/trakt/pencil.svg?raw';
import trakt from '$lib/icons/trakt/trakt.svg?raw';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { createListManager } from '$lib/lists/createListManager.svelte';
import { listGenreOptions } from '$lib/lists/listGenreOptions';
import { listHref } from '$lib/lists/listHref';
import ListItemPoster from '$lib/lists/ListItemPoster.svelte';
import ListManageBar from '$lib/lists/ListManageBar.svelte';
import type { ListSortGroup } from '$lib/lists/listItemSorts';
import { listTitleActions } from '$lib/lists/listTitleActions';
import ListStats from '$lib/lists/ListStats.svelte';
import { listTypeOptions } from '$lib/lists/listTypeOptions';
import type { loadBuiltInList } from '$lib/lists/loadBuiltInList';
import type { loadOfficialList } from '$lib/lists/loadOfficialList';
import type { loadList } from '$lib/lists/loadList';
import type { ListItemCard } from '$lib/lists/toListItemCard';
import { visibleListSorts } from '$lib/lists/visibleListSorts';

type Props = {
  data:
    | (
      & (Awaited<ReturnType<typeof loadList>> | Awaited<ReturnType<typeof loadBuiltInList>>)
      & { profile: ProfileUser; user: HeaderUser | null; settings?: ViewerSettings | null }
    )
    | (Awaited<ReturnType<typeof loadOfficialList>> & { user: HeaderUser | null; settings?: ViewerSettings | null });
};

const { data }: Props = $props();
const groupHeaders: Readonly<Record<ListSortGroup, string | undefined>> = {
  main: undefined,
  site: 'Site Ratings',
  votes: 'Votes',
  mine: 'Your data',
};

let fadeHide = $derived(data.fadeHide);
const filterOptions = $derived(
  listFilterOptions({
    kind: data.kind,
    types: data.query.types,
    isSelf: data.kind !== 'official' && data.user?.slug === data.profile.slug,
  }),
);
const country = $derived(data.settings?.browsing?.watchnow?.country?.toLowerCase() || 'us');
const favoriteKeys = $derived(data.settings?.browsing?.watchnow?.favorites ?? []);
const tiles = $derived(
  data.list
    ? watchNowTiles({
      watchnow: data.query.watchnow?.split(',') ?? [],
      sources: data.filterSources,
      country,
      favorites: favoriteSlugs(favoriteKeys, country, country),
    })
    : [],
);
let reportOpen = $state(false);
let left = $state(false);
let leaving = $state(false);
$effect(() => {
  void data.list;
  void data.user;
  left = false;
  leaving = false;
  reportOpen = false;
});
const collaboratorNames = $derived(
  data.list
    ? data.collaborators.filter((_, index) =>
      !left || !('viewerCollaboratorName' in data) ||
      index !== data.collaborators.indexOf(data.viewerCollaboratorName ?? '')
    )
    : [],
);
async function leave() {
  if (!data.list || !data.user || leaving || left) return;
  const source = data;
  leaving = true;
  const ok = await leaveList({
    fetch: authenticatedFetch({ manager: userManager() }),
    id: data.list.id,
    viewer: data.user.slug,
    patch: () => {
      left = true;
      return () => {
        if (data === source) left = false;
      };
    },
    notify: (message) => {
      if (data === source) toast.error(message);
    },
  });
  if (data !== source) return;
  leaving = false;
  if (ok) {
    toast.success('You stopped collaborating on this list.');
    await goto(resolve('/users/[id]/lists/collaborations', { id: data.user.slug }));
  }
}
const vip = $derived(data.user?.isVip ?? false);
const typeOptions = $derived(listTypeOptions(data.kind));
const typeLabel = $derived(
  data.query.types.length > 0
    ? data.query.types.map((type) => typeOptions.find((option) => option.type === type)?.label ?? type).join(', ')
    : 'All Types',
);
const genreLabel = $derived(
  data.query.genres.length > 0
    ? data.query.genres.map((slug) => listGenreOptions.find((option) => option.slug === slug)?.label ?? slug)
      .join(', ')
    : 'All Genres',
);
const sorts = $derived(visibleListSorts({ types: data.query.types, vip, signedIn: data.user !== null }));
const groups = $derived(
  (['main', 'site', 'votes', 'mine'] as const)
    .map((group) => ({ group, sorts: sorts.filter((sort) => sort.group === group) }))
    .filter((group) => group.sorts.length > 0),
);
const actions = $derived(
  data.list
    ? listTitleActions({
      list: data.list,
      viewer: data.user ? { slug: data.user.slug, isVip: data.user.isVip } : null,
      isCollaborator: data.isCollaborator && !left,
      origin: page.url.origin,
    })
    : null,
);
// : the watchlist and favorites are titled after their owner.
const pageTitle = $derived(
  data.kind === 'official'
    ? data.list.name
    : data.kind === 'watchlist' || data.kind === 'favorites'
    ? `${data.profile.displayName}'s ${data.kind}`
    : `${data.list?.name}, a list by ${data.profile.displayName}`,
);
let editing = $state(false);
let deleting = $state(false);
let personalCount = $state<number>();
const limit = $derived(page.data.settings?.limits?.list?.count);
const deleteWarning = $derived(
  limit !== undefined && (personalCount ?? 0) > limit
    ? `You're over the ${limit} list limit. You won't be able to re-create this list if you delete it.`
    : "This can't be undone!",
);
$effect(() => {
  if (!actions?.delete) return;
  api({ fetch: authenticatedFetch({ manager: userManager() }) }).users.lists.personal({
    params: { id: 'me' },
    query: { limit: 1 },
  }).then((response) => {
    if (response.status === 200) {
      personalCount = Number(response.headers.get('x-pagination-item-count')) || response.body.length;
    }
  }).catch(() => {});
});
async function removeList() {
  if (!data.list || data.list.id === null || deleting) return;
  deleting = true;
  const ok = await deleteList({
    id: data.list.id,
    overlay,
    notify: toast,
    request: (path, method) =>
      rawApiFetch({ fetch: authenticatedFetch({ manager: userManager() }), path, init: { method } }),
    remove: () => () => {},
  });
  deleting = false;
  if (ok) {
    void overlay.refresh();
    await goto(resolve('/users/[id]/lists', { id: data.list.ownerSlug }));
  }
}
const ownerKind = $derived(data.kind === 'watchlist' || data.kind === 'favorites' ? data.kind : null);
const owner = $derived(ownerKind !== null && data.user?.slug === data.list?.ownerSlug);
// Outgoing posters must not read a derived after its owning effect has been destroyed.
let removingFromOwner = false;
$effect.pre(() => {
  removingFromOwner = owner;
});

let ownerManaging = $state(false);
let ownerBusy = $state(false);
let allItems = $state<readonly ListItemCard[] | null>(null);
let selectedKeys = $state<readonly number[] | null>(null);
let removedKeys = $state<readonly number[]>([]);
let savedDescription = $state<string | undefined>();
const description = $derived(parseComment(savedDescription ?? data.list?.description ?? ''));
let defaultBy = $state('rank');
let defaultHow = $state('asc');
let notesItem = $state<ListItemCard | null>(null);
let notesOpen = $state(false);
let notesDraft = $state('');
const ownerCards = $derived((ownerManaging && allItems && selectedKeys
  ? selectedKeys.flatMap((key) => {
    const item = allItems?.find((row) => row.key === key);
    return item ? [item] : [];
  })
  : (data.list ? data.cards : []).map((item) => allItems?.find((row) => row.key === item.key) ?? item))
  .filter((item) => !removedKeys.includes(item.key)));
const request = (path: string, init?: Parameters<typeof rawApiFetch>[0]['init']) =>
  rawApiFetch({ fetch: authenticatedFetch({ manager: userManager() }), path, init });
$effect(() => {
  void (data.list ? data.cards : undefined);
  ownerBusy = false;
  allItems = null;
  selectedKeys = null;
  removedKeys = [];
  ownerManaging = false;
  editing = false;
  notesOpen = false;
  savedDescription = undefined;
});
async function editList() {
  if (!owner || !ownerKind || ownerBusy || transferBusy) return;
  ownerBusy = true;
  const source = data;
  try {
    const response = await request(`/users/me/${ownerKind}?limit=1`);
    if (source !== data) return;
    if (!response.ok) throw new Error('Unavailable defaults');
    listItemRowsSchema.parse(await response.json());
    defaultBy = response.headers.get('x-sort-by') ?? 'rank';
    defaultHow = response.headers.get('x-sort-how') === 'desc' ? 'desc' : 'asc';
    editing = true;
  } catch {
    toast.error("Doh! We couldn't load your list's default sorting.");
  } finally {
    if (source === data) ownerBusy = false;
  }
}
async function saveMetadata(body: { description?: string; sort_by: string; sort_how: string }) {
  if (!owner || !ownerKind || ownerBusy || transferBusy) return;
  const source = data;
  const before = savedDescription;
  if (body.description !== undefined) savedDescription = body.description;
  ownerBusy = true;
  const ok = await writeOwnerList({ kind: ownerKind, change: { type: 'metadata', body }, request, notify: toast });
  if (source !== data) return;
  if (!ok) savedDescription = before;
  else {
    defaultBy = body.sort_by;
    defaultHow = body.sort_how;
    editing = false;
    toast.success('List saved!');
  }
  ownerBusy = false;
}
async function toggleManage() {
  if (!owner || !ownerKind || !data.list || ownerBusy || transferBusy) return;
  if (ownerManaging) {
    ownerManaging = false;
    return;
  }
  ownerBusy = true;
  const source = data;
  try {
    const [complete, selection] = await Promise.all([
      loadOwnerItems({ kind: ownerKind, request }),
      loadOwnerItems({ kind: ownerKind, request, selection: { query: data.query, sort: data.sort } }),
    ]);
    if (source !== data || !data.list) return;
    const options = { sortBy: data.sort.by, datePreferences: data.datePreferences };
    const items = complete.map((row) => toListItemCard(row, options));
    if (selection.some((row) => !items.some((item) => item.key === row.id))) throw new Error('List changed');
    allItems = items;
    selectedKeys = selection.map((row) => row.id);
    ownerManaging = true;
  } catch {
    toast.error("Doh! We couldn't load the complete list. Please try again.");
  } finally {
    if (source === data) ownerBusy = false;
  }
}
async function saveOrder(next: readonly ListItemCard[]) {
  if (!owner || !ownerKind || !allItems || ownerBusy || transferBusy) return;
  const source = data;
  const before = allItems;
  const beforeKeys = selectedKeys;
  allItems = next;
  selectedKeys = next.filter((item) => beforeKeys?.includes(item.key)).map((item) => item.key);
  ownerBusy = true;
  const ok = await writeOwnerList({
    kind: ownerKind,
    change: { type: 'order', rank: next.map((item) => item.key) },
    request,
    notify: toast,
  });
  if (source !== data) return;
  if (!ok) {
    allItems = before;
    selectedKeys = beforeKeys;
  }
  ownerBusy = false;
}
function moveItem(item: ListItemCard, rank: number) {
  if (!ownerManaging || !allItems || ownerBusy || transferBusy) return;
  const order = allItems.map((row) => row.key);
  const next = moveListItem(order, item.key, rank);
  if (next !== order) void saveOrder(rerankListCards(allItems, next, { by: 'rank', how: 'asc' }));
}
function resetOrder() {
  if (!allItems || ownerBusy || transferBusy) return;
  const keys = ownerCards.map((item) => item.key);
  void saveOrder(
    [...ownerCards, ...allItems.filter((item) => !keys.includes(item.key))].map((item, i) => ({
      ...item,
      rank: i + 1,
    })),
  );
}
async function removeItems(items: readonly ListItemCard[]) {
  if (!owner || !ownerKind || !allItems || ownerBusy || !items.length) return;
  const source = data;
  const before = allItems;
  const beforeRemoved = removedKeys;
  const keys = items.map((item) => item.key);
  allItems = allItems.filter((item) => !keys.includes(item.key)).map((item, i) => ({ ...item, rank: i + 1 }));
  removedKeys = [...removedKeys, ...keys];
  ownerBusy = true;
  const ok = await removeOwnerItems({ kind: ownerKind, items, overlay, request, notify: toast });
  if (source !== data) return;
  if (!ok) {
    allItems = before;
    removedKeys = beforeRemoved;
  } else toast.success(`Removed ${items.length} ${items.length === 1 ? 'item' : 'items'}.`);
  ownerBusy = false;
}
function editNotes(item: ListItemCard) {
  if (ownerBusy || transferBusy) return;
  notesItem = item;
  notesDraft = item.notes ?? '';
  notesOpen = true;
}
async function saveOwnerNotes(notes: string) {
  if (!owner || !ownerKind || !notesItem || !allItems || ownerBusy || transferBusy) return;
  const item = notesItem;
  const source = data;
  const before = allItems;
  allItems = allItems.map((row) => row.key === item.key ? { ...row, notes: notes.trim() } : row);
  ownerBusy = true;
  const ok = await writeOwnerList({
    kind: ownerKind,
    change: { type: 'notes', id: item.key, notes },
    request,
    notify: toast,
  });
  if (source !== data) return;
  if (!ok) allItems = before;
  else {
    notesOpen = false;
    toast.success('Notes saved!');
  }
  ownerBusy = false;
}
function dragItem(item: ListItemCard, event: PointerEvent) {
  if (ownerBusy || event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
  event.preventDefault();
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const end = (endEvent: PointerEvent) => {
    const target = document.elementFromPoint(endEvent.clientX, endEvent.clientY)?.closest('[data-list-item]');
    const key = Number(target?.getAttribute('data-list-item'));
    const row = allItems?.find((item) => item.key === key);
    cleanup();
    if (row) moveItem(item, row.rank);
  };
  const cancel = () => cleanup();
  const cleanup = () => {
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', cancel);
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  };
  handle.addEventListener('pointerup', end, { once: true });
  handle.addEventListener('pointercancel', cancel, { once: true });
}
const plural = (count: number, word: string) => `${word}${count === 1 ? '' : 's'}`;

// Manage mode. The watchlist and favorites get it with their own endpoints in.
const canManage = $derived(Boolean(actions?.manage) && data.list?.kind === 'personal');
let transferBusy = $state(false);
const manager = createListManager(
  () =>
    data.list === null
      ? { list: null, cards: [], sort: { by: 'rank', how: 'asc' }, query: data.query }
      : { list: data.list, cards: data.cards, sort: data.sort, query: data.query },
  () => transferBusy,
);
$effect(() => {
  void data.list;
  untrack(manager.reset);
});
afterNavigate(() => {
  manager.managing = false;
  ownerManaging = false;
});
const managing = $derived(owner ? ownerManaging : canManage && manager.managing);
const displayCards = $derived(owner ? ownerCards : manager.cards);
const writing = $derived((owner ? ownerBusy : manager.busy) || transferBusy);
// OG dragged only a ranked list that fits one page, and offered "Change position" in the other sorts.
const draggable = $derived(
  data.list !== null && data.sort.by === 'rank' && !(owner && managing) && data.page.type === 'paginated' &&
    data.page.total === 1,
);
const duration = $derived(prefersReducedMotion.current ? 0 : 300);
const rankInputs: Record<number, RankInput> = $state({});

// `m` toggles manage mode, except while typing or in a dialog.
const shortcut = () => {
  const keydown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'm' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable], dialog, [popover]:popover-open')
    ) {
      return;
    }
    if (owner) {
      event.preventDefault();
      void toggleManage();
      return;
    }
    if (!canManage) return;
    event.preventDefault();
    manager.managing = !manager.managing;
  };
  window.addEventListener('keydown', keydown);
  return () => window.removeEventListener('keydown', keydown);
};

let noteCard = $state<ListItemCard | null>(null);
let noteOpen = $state(false);
let noteDraft = $state('');
let noteLimit = $state<string | null>(null);
let noteSaving = $state(false);
function openNotes(item: ListItemCard) {
  noteCard = item;
  noteDraft = item.notes ?? '';
  noteLimit = null;
  noteOpen = true;
}
async function saveNotes(text: string) {
  if (!noteCard || noteSaving) return;
  noteSaving = true;
  try {
    const result = await manager.saveNote(noteCard, text);
    if (result.saved) noteOpen = false;
    noteLimit = result.limit ?? null;
  } finally {
    noteSaving = false;
  }
}
</script>

<!-- Filter and item URLs point at og pages by their OG paths, which resolve() only takes once they exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  {#if data.list}
    <title>{pageTitle} - Trakt</title>
    {#if data.list.description}<meta name="description" content={data.list.description} />{/if}
  {/if}
</svelte:head>

{#if editing && data.kind === 'personal' && data.list}<ListEditor id={data.list.id}
  onsaved={(slug) => goto(resolve('/users/[id]/lists/[list]', { id: data.list?.ownerSlug ?? data.profile.slug, list: slug }))}
  onclose={() => { editing = false; }} />{/if}

{#if data.list}
  {@const list = data.list}

  {#snippet action(label: string, svg: string, kind: string, text?: string, onclick?: () => void)}
    <Tooltip text={label}>
      {#snippet trigger(tooltip)}
        <button type="button" class={['action', kind]} aria-label={text ? undefined : label} aria-disabled={!onclick || ownerBusy} aria-pressed={kind === 'manage' && onclick ? ownerManaging : undefined}
          onclick={() => { if (!ownerBusy) onclick?.(); }} {...tooltip}>
          <Icon {svg} />{#if text}<span class="action-text">{text}</span>{/if}
        </button>
      {/snippet}
    </Tooltip>
  {/snippet}


  <ReportDialog bind:open={reportOpen} target={{ type: 'list', id: list.id, title: list.name, href: list.href,
    ownerSlug: list.kind === 'personal' ? list.ownerSlug : undefined }} />

  {#if data.kind === 'official'}<OfficialListHeader image={data.listCover} />{/if}

  <SectionToolbar>
    {#snippet filters()}
      <Dropdown>
        {#snippet trigger()}{typeLabel}{/snippet}
        <ul>
          <li><a href={listHref(page.url, { types: [] })}
            aria-current={data.query.types.length === 0 ? 'page' : undefined}>All Types</a></li>
          {#each typeOptions as option (option.type)}
            <li><a href={listHref(page.url, { types: [option.type] })}
              aria-current={data.query.types.includes(option.type) ? 'page' : undefined}>{option.label}</a></li>
          {/each}
        </ul>
      </Dropdown>
      <Dropdown>
        {#snippet trigger()}{genreLabel}{/snippet}
        <ul class="limit-10">
          <li><a href={listHref(page.url, { genres: [] })}
            aria-current={data.query.genres.length === 0 ? 'page' : undefined}>All Genres</a></li>
          {#each listGenreOptions as option (option.slug)}
            <li><a href={listHref(page.url, { genres: [option.slug] })}
              aria-current={data.query.genres.includes(option.slug) ? 'page' : undefined}>{option.label}</a></li>
          {/each}
        </ul>
      </Dropdown>
    {/snippet}
    {#snippet summary()}
      <ListStats
        itemCount={owner ? Math.max(0, data.total - removedKeys.length) : data.total}
        stats={data.stats}
        progress={data.user !== null && list.kind !== 'official'}
        likeTarget={{ id: list.id, ownerSlug: list.kind === 'personal' ? list.ownerSlug : undefined, viewer: data.user?.slug ?? null }}
        likeCount={list.kind === 'watchlist' || list.kind === 'favorites' ? undefined : list.likeCount}
        comments={list.allowComments ? { count: list.commentCount, href: `${list.href}/comments` } : undefined}
      />
      <span class="sort">
        <Dropdown>
          {#snippet trigger()}{sorts.find(({ by }) => by === data.sort.by)?.label ?? 'Rank'}{/snippet}
          {#each groups as { group, sorts: items }, i (group)}
            {#if i > 0}<hr />{/if}
            <ul>
              {#if groupHeaders[group]}<li class="header" role="presentation">{groupHeaders[group]}</li>{/if}
              {#each items as sort (sort.by)}
                <li><a href={listHref(page.url, { sort: { by: sort.by, how: data.sort.how } })}
                  aria-current={sort.by === data.sort.by ? 'page' : undefined}>{sort.label}</a></li>
                {#if sort.by === 'percentage' && !vip}
                  <li><a href="/vip" class="vip-only"><b class="vip-mark"><Icon svg={trakt} /> VIP</b> unlocks
                    IMDB,<br />TMDB, Rotten Tomatoes,<br />and Metacritic sorting</a></li>
                {/if}
              {/each}
            </ul>
          {/each}
        </Dropdown>
        <SortDirection bind:flipped={
          () => data.sort.how === 'desc',
          (next) => goto(listHref(page.url, { sort: { by: data.sort.by, how: next ? 'desc' : 'asc' } }))
        } />
      </span>
      <span class="filter-icons">
        <TermsFilter vip={vip} bind:terms={
          () => data.query.terms ?? '',
          (terms) => goto(listHref(page.url, { terms }))
        } />
        <WatchNowFilter value={data.query.watchnow} {country} favorites={favoriteKeys} />
        <FadeHideMenu value={fadeHide} options={filterOptions.fade} hideOptions={filterOptions.hide}
          cookie={data.kind === 'personal' || data.kind === 'official' ? 'list' : data.kind} variant="default" onchange={(next) => {
            const changed = next.hide.join(',') !== fadeHide.hide.join(',');
            fadeHide = next;
            const url = new URL(page.url);
            url.searchParams.set('fade', next.fade.join(','));
            replaceState(url, page.state);
            if (changed) void goto(listHref(page.url, { hide: next.hide }));
          }} />
      </span>
    {/snippet}
  </SectionToolbar>

  <section class="title-row" aria-labelledby="list-title">
  <Container>
    <div class="title-bar">
        <h2 id="list-title">
          <a class="list-title" href={list.href}>{list.name}</a>
          {#each list.pills as pill (pill)}<span class="pill">{pill}</span>{/each}
          {#if list.shareLink}
            <Tooltip text="Anyone with this link can view the list">
              {#snippet trigger(tooltip)}<span class="pill share-link" {...tooltip}>Link</span>{/snippet}
            </Tooltip>
          {/if}
          {#if collaboratorNames.length > 0}
            <Tooltip text={collaboratorNames.join('\n')}>
              {#snippet trigger(tooltip)}
                <span class="pill collaborators" {...tooltip}><span class="pill-title">{collaboratorNames.length}</span
                  >{plural(collaboratorNames.length, 'collaborator')}</span>
              {/snippet}
            </Tooltip>
          {/if}
        </h2>
        {#if actions}
          <!-- The writes are phase 2: report and share, edit and delete, manage, copy. -->
          <div class="actions">
            {#if actions.report}{@render action('Report List', flag, 'report', undefined, () => { reportOpen = true; })}{/if}
            {#if actions.edit && data.kind !== 'personal'}{@render action('Edit', pencil, 'edit', undefined, owner ? editList : undefined)}{:else if actions.edit}<Tooltip text="Edit">{#snippet trigger(tooltip)}<button type="button" class="action edit" aria-label="Edit" {...tooltip} onclick={() => { editing = true; }}><Icon svg={pencil} /></button>{/snippet}</Tooltip>{/if}
            {#if actions.delete}<span class="delete" style:--confirm-icon-size="var(--font-size-list-row-action)"><ManageConfirm name="delete" svg={deleteIcon} label="Delete" yes="Yes, delete it!" warning={deleteWarning} disabled={deleting} onconfirm={removeList}>Delete this list?</ManageConfirm></span>{/if}
            {#if actions.leave}{@render action('Stop collaborating on this list', userXmark, 'leave', undefined, leave)}{/if}
            <span class="share"><ShareButton url={actions.shareUrl} title={list.name} large={false} /></span>
            {#if actions.manage && canManage}
              <Tooltip text="Reorder, copy, move and delete">
                {#snippet trigger(tooltip)}
                  <button type="button" class={['action', 'manage', { active: managing }]} aria-pressed={managing}
                    aria-keyshortcuts="m" {...tooltip} onclick={() => manager.managing = !manager.managing}><Icon
                      svg={move}
                    /><span class="action-text">Manage</span></button>
                {/snippet}
              </Tooltip>
            {:else if actions.manage}
              {@render action('Reorder, copy, move and delete', move, 'manage', 'Manage', owner ? toggleManage : undefined)}
            {/if}
            {#if actions.copy}<ListTransfer source={list} query={data.query} sort={data.sort} count={data.total} svg={documentAdd} />{/if}
            {#if actions.progressHref}
              <Tooltip text="View watched progress">
                {#snippet trigger(tooltip)}
                  <a class="action progress" href={actions.progressHref} {...tooltip}><Icon svg={barsProgress} /><span
                      class="action-text"
                    >Progress</span></a>
                {/snippet}
              </Tooltip>
            {/if}
          </div>
        {/if}
      </div>
  </Container>
</section>

  {#if managing}
    <ListManageBar count={owner ? ownerCards.length : data.total} busy={writing}
  onreset={owner ? resetOrder : manager.resetRanks}
  ondelete={owner ? () => void removeItems(ownerCards) : manager.deleteAll}>
      {#snippet transfers()}
        <ListTransfer source={list} query={data.query} sort={data.sort} count={owner ? ownerCards.length : data.total} svg={clone} busy={writing} onbusychange={(busy) => transferBusy = busy} managing />
        <ListTransfer source={list} query={data.query} sort={data.sort} count={owner ? ownerCards.length : data.total} svg={fileExport} busy={writing} onbusychange={(busy) => transferBusy = busy} move managing />
      {/snippet}
    </ListManageBar>
  {/if}
  <WatchNowChips {tiles} />

  {#if description.length > 0}
    <section class="description" aria-label="About this list">
  <Container>
    <div class="description-text">
      <ReadMore>
        <CommentText blocks={description} />
      </ReadMore>
    </div>
  </Container>
</section>
  {/if}

  <section class={['items', { managing }]} aria-label="{list.name} items" aria-busy={writing} {@attach shortcut}>
  <Container>
      {#if displayCards.length > 0}
        {#if !(owner && managing) && data.page.type === 'paginated'}<Pagination meta={data.page} label="List pages" />{/if}
        <div class="grid" {@attach manager.dragEvents}>
          <PosterGrid>
            {#each displayCards as item (item.key)}
              <div data-list-item={item.key} class={{ dragging: manager.dragging?.key === item.key,
                'drop-target': manager.dragging && manager.dropRank === item.rank }} animate:flip={{ duration }}>
                <ListItemPoster {item} rank={list.displayNumbers && !managing ? item.rank : undefined}
                  removing={() => removingFromOwner ? removedKeys.includes(item.key) : manager.isRemoved(item.key)} datePreferences={data.datePreferences}
                  edit={managing ? edit : undefined} fade={fadeHide.fade} />
              </div>
            {/each}
          </PosterGrid>
        </div>
        {#snippet edit(item: ListItemCard)}
          <RankInput bind:this={rankInputs[item.key]} name={item.title} rank={item.rank} busy={writing}
            onmove={(rank) => owner ? moveItem(item, rank) : manager.move(item, rank)} />
          <ListItemEdit name={item.title} rank={item.rank} total={owner && allItems ? allItems.length : data.total} notes={Boolean(item.notes)} draggable={owner ? data.sort.by === 'rank' : draggable}
            changeRank={data.sort.by !== 'rank'} busy={writing} onmove={(rank) => owner ? moveItem(item, rank) : manager.move(item, rank)}
            ondrag={(event) => owner ? dragItem(item, event) : manager.startDrag(item, event)} onchangerank={() => rankInputs[item.key]?.focus()}
            onremove={() => owner ? void removeItems([item]) : manager.remove(item)} onnotes={() => owner ? editNotes(item) : openNotes(item)} />
        {/snippet}
        {#if !(owner && managing) && data.page.type === 'paginated'}<Pagination meta={data.page} label="List pages" />{/if}
      {:else}
        <div class="empty"><NoData /></div>
      {/if}
    </Container>
</section>

  {#if ownerKind && owner}
    <BuiltInListDialog bind:open={editing} kind={ownerKind} avatar={data.user?.avatarUrl} {vip} busy={ownerBusy}
  description={savedDescription}
  sortBy={defaultBy} sortHow={defaultHow} onsave={saveMetadata} />
    {#if notesItem}
      <NotesDialog bind:open={notesOpen} bind:draft={notesDraft} favorite={ownerKind === 'favorites'} busy={ownerBusy}
  eyebrow={ownerKind === 'watchlist' && notesItem.noteTitle.show ? `Add notes to ${notesItem.noteTitle.show}` : undefined}
  item={notesItem.noteTitle} onsave={saveOwnerNotes} />
    {/if}
  {/if}
  {#if !owner && noteCard}
    <NotesDialog bind:open={noteOpen} bind:draft={noteDraft} busy={noteSaving} disabled={noteLimit !== null}
  eyebrow={noteCard.noteTitle.show ? `Add notes to ${noteCard.noteTitle.show}` : undefined}
  item={noteCard.noteTitle} onsave={saveNotes}>
      {#if noteLimit !== null}
        <p class="notes-limit" role="alert">You've already added <strong>{noteLimit}</strong> notes.
          {#if !vip}Upgrade to <a href="/vip/notes">VIP</a> to add unlimited notes.{/if}</p>
      {/if}
    </NotesDialog>
  {/if}
{/if}

<style>
.filter-icons {
  display: flex;
  align-items: center;
  gap: var(--list-filter-icon-gap);
}

.sort {
  display: flex;
  align-items: center;
}

.limit-10 {
  max-block-size: var(--dropdown-limit-10-height);
  overflow-y: auto;
}

/* `.dropdown-menu a.vip-only`. */
.vip-only {
  padding-block: var(--vip-sort-padding-block);
  background-color: var(--state-danger-bg);
  color: var(--state-danger-text);
  font-size: var(--font-size-vip-sort);
  white-space: normal;
  transition: all 0.5s;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary);
    color: var(--color-text-inverse);

    & .vip-mark {
      color: inherit;
    }
  }
}

.vip-mark {
  color: var(--brand-primary);
  transition: color 0.5s;
}

.title-row {
  padding: var(--list-title-padding);
  background-color: var(--color-surface);
}

.title-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  column-gap: var(--gutter);
}

h2 {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin: var(--list-title-heading-margin);
  font-family: var(--font-headings);
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-headings);
}

.list-title {
  color: inherit;
  text-decoration: none;

  &:is(:hover, :focus-visible) {
    color: var(--color-link);
  }
}

.pill {
  margin-inline-start: var(--list-title-pill-gap);
  padding: 1px 4px;
  border-radius: 2px;
  background-color: var(--color-pill);
  color: var(--color-card-text);
  font-size: var(--font-size-card-tag);
  text-transform: uppercase;
  vertical-align: middle;
}

.share-link {
  background-color: var(--color-list-pill-link);
}

.collaborators {
  background-color: var(--color-list-pill-collaborators);
  cursor: default;
}

.pill-title {
  display: inline-block;
  margin: 0 4px 0 -4px;
  padding: 2px 4px 1px;
  border-radius: 2px 0 0 2px;
  background-color: var(--color-list-pill-collaborators-count);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--list-row-action-gap);
  color: var(--color-list-title-action);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-list-row-action);
  line-height: 1;
  text-decoration: none;

  &[aria-disabled='true'] {
    cursor: default;
  }
}

.action-text {
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  font-weight: var(--font-weight-headings-light);
  text-transform: uppercase;
}

/* OG faded the flag in while the pointer was over the title row. */
.report {
  opacity: 0;
  transition: opacity 0.5s;

  .title-row:hover &,
  &:focus-visible {
    opacity: 1;
  }
}

.edit {
  color: var(--color-list-edit);
}

.delete,
.leave {
  color: var(--color-list-delete);
}

.leave {
  font-size: var(--font-size-list-row-leave);
}

.progress {
  font-size: var(--font-size-list-title-progress);

  &:is(:hover, :focus-visible) {
    color: inherit;
  }
}

.share {
  color: var(--brand-secondary);
  font-size: var(--font-size-list-title-share);
}

.description {
  --read-more-shade: var(--color-subnav-text-bg);
  background-color: var(--color-subnav-text-bg);
  font-size: var(--font-size-subnav-text);
}

.description-text {
  padding-block: var(--subnav-text-padding);
}

.items {
  display: flow-root;
  padding-block-end: var(--space-panel);

  /* The top pagination spacing and.pagination-bottom. */
  & :global(nav) {
    margin-block: var(--line-height-computed) 0;
  }
}

.empty {
  padding-block-start: var(--line-height-computed);
}

.manage {
  cursor: pointer;

  & :global(svg) {
    transition: rotate 0.5s;
  }

  &.active {
    color: var(--brand-primary);

    & :global(svg) {
      rotate: 180deg;
    }
  }

  &:focus-visible {
    outline: var(--list-reorder-rank-border) solid var(--color-input-border-focus);
  }
}

/* #sortable-grid.sortable: the quick icons dim while the edit icons are up. */
.managing :global(.quick-icons > *) {
  opacity: var(--opacity-list-manage-quick-icons);
}

.dragging {
  opacity: var(--list-reorder-drag-opacity);
}

.drop-target {
  outline: var(--list-reorder-rank-border) solid var(--brand-primary);
}

.grid [data-list-item] {
  scroll-margin-block-start: calc(var(--header-height) + var(--list-reorder-scroll-offset));
}

.notes-limit {
  margin: 0 0 var(--gutter);
  text-align: center;
}

/* OG kept only the icons on tablets and phones. */
@media (width < 992px) {
  .action-text {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .manage :global(svg),
  .report,
  .vip-only,
  .vip-mark {
    transition: none;
  }
}
</style>
