import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { tick } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';
import { SvelteSet } from 'svelte/reactivity';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { userManager } from '../auth/userManager.ts';
import { toast } from '../components/toast/toast.svelte.ts';
import { fetchListItemRefs } from './fetchListItemRefs.ts';
import type { ListQuery } from './ListQuery.ts';
import { moveListItem } from './moveListItem.ts';
import { removeListItems } from './removeListItems.ts';
import { reorderListItems } from './reorderListItems.ts';
import { rerankListCards } from './rerankListCards.ts';
import type { ListSort } from './resolveListSort.ts';
import { saveListItemNote } from './saveListItemNote.ts';
import type { ListItemCard } from './toListItemCard.ts';
import type { ListView } from './toListView.ts';

type Source = {
  list: Pick<ListView, 'id' | 'slug' | 'ownerSlug' | 'name' | 'href'> | null;
  cards: readonly ListItemCard[];
  sort: ListSort;
  query: ListQuery;
};

// OG's `saveListOrder` toast .
const MOVE_FAILED =
  'Doh! We ran into an error. Please try signing out of Trakt, clear your browser cache, and sign back in.';

const request = (method: 'POST' | 'PUT') => (path: string, body: unknown) =>
  rawApiFetch({
    fetch: authenticatedFetch({ manager: userManager() }),
    path,
    init: { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });

/**
 * A list page's manage mode: the page's optimistic cards and the whole list's order, and the writes
 * that change them. Moves patch the cards and roll back on failure; removals and the bulk actions reload the page.
 * The state is page-scoped: new loader data replaces it, and it's never persisted or shared between requests.
 */
export function createListManager(source: () => Source, isBlocked: () => boolean = () => false) {
  let managing = $state(false);
  let busy = $state(false);
  let patched = $state<readonly ListItemCard[] | null>(null);
  /** Every list item id in rank order, read the first time a move needs it. */
  let order: readonly number[] | null = null;
  const removed = new SvelteSet<number>();
  let dragging = $state<ListItemCard | null>(null);
  let dropRank = $state<number | null>(null);

  const cards = $derived(patched ?? source().cards);
  const items = () => {
    const { list, query, sort } = source();
    if (!list) throw new Error('No list to manage');
    return {
      list,
      owner: list.ownerSlug,
      listId: list.id,
      base: `/users/${encodeURIComponent(list.ownerSlug)}/lists/${encodeURIComponent(list.slug)}/items`,
      query,
      sort,
    };
  };

  /** New loader data (a reload or another page) drops the patches. */
  function reset() {
    patched = null;
    order = null;
    removed.clear();
  }

  async function wholeOrder() {
    const { base } = items();
    order ??= (await fetchListItemRefs({
      fetch: authenticatedFetch({ manager: userManager() }),
      base,
      query: { types: [], genres: [] },
      sort: { by: 'rank', how: 'asc' },
    })).map(({ id }) => id);
    return order;
  }

  /** Runs one write at a time, like OG's single loading state. */
  async function exclusive(run: () => Promise<void>) {
    if (busy || isBlocked()) return;
    busy = true;
    try {
      await run();
    } catch {
      toast.error('Doh! We ran into some sort of error.');
    } finally {
      busy = false;
    }
  }

  // Moving a card moves its DOM node, which drops focus: put it back on the control that moved it.
  const scrollTo = async (key: number) => {
    const focused = document.activeElement;
    await tick();
    if (focused instanceof HTMLElement && focused !== document.activeElement) focused.focus({ preventScroll: true });
    document.querySelector(`[data-list-item="${key}"]`)?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion.current ? 'instant' : 'smooth',
    });
  };

  const manager = {
    get managing() {
      return managing;
    },
    set managing(value: boolean) {
      if (!busy && !isBlocked()) managing = value;
    },
    get busy() {
      return busy;
    },
    get cards() {
      return cards;
    },
    /** A card that just left the list fades out; one leaving for another page doesn't. */
    isRemoved: (key: number) => removed.has(key),
    reset,
    get dragging() {
      return dragging;
    },
    get dropRank() {
      return dropRank;
    },

    /** The drag handle's pointerdown: the card follows the pointer over the grid until it's let go. */
    startDrag(card: ListItemCard, event: PointerEvent) {
      if (busy || isBlocked() || event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging = card;
      dropRank = card.rank;
    },

    /** Attach to the grid: tracks the card under the pointer, scrolls near the edges, and drops or cancels. */
    dragEvents(element: HTMLElement) {
      const stop = () => {
        dragging = null;
        dropRank = null;
      };
      const move = (event: PointerEvent) => {
        if (!dragging) return;
        if (event.clientY < 100) globalThis.scrollBy(0, -20);
        if (event.clientY > globalThis.innerHeight - 100) globalThis.scrollBy(0, 20);
        const key = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-list-item]')
          ?.dataset.listItem;
        const over = cards.find((card) => String(card.key) === key);
        if (over) dropRank = over.rank;
      };
      const end = (event: PointerEvent) => {
        const card = dragging;
        const rank = dropRank;
        stop();
        if (event.type === 'pointerup' && card && rank !== null) void manager.move(card, rank);
      };
      const cancel = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || !dragging) return;
        event.preventDefault();
        stop();
      };
      globalThis.addEventListener('keydown', cancel);
      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', end);
      element.addEventListener('pointercancel', end);
      return () => {
        globalThis.removeEventListener('keydown', cancel);
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', end);
        element.removeEventListener('pointercancel', end);
      };
    },

    /** Move an item to a 1-based rank in the whole list, across pages. */
    move: (card: ListItemCard, rank: number) =>
      exclusive(async () => {
        const data = source().cards;
        const before = { order: await wholeOrder(), cards };
        const next = moveListItem(before.order, card.key, rank);
        if (next === before.order) return;
        order = next;
        patched = rerankListCards(cards, next, source().sort);
        void scrollTo(card.key);
        const { owner, listId } = items();
        const ok = await reorderListItems({
          owner,
          listId,
          rank: next,
          request: request('POST'),
          notify: toast,
          failure: MOVE_FAILED,
        });
        if (!ok && data === source().cards) {
          order = before.order;
          patched = before.cards;
        }
      }),

    /** The x icon: the card fades out, then the ranks close the gap like OG's re-save, and the page reloads. */
    remove: (card: ListItemCard) =>
      exclusive(async () => {
        const before = cards;
        const { owner, listId } = items();
        removed.add(card.key);
        patched = cards.filter(({ key }) => key !== card.key);
        const ok = await removeListItems({
          owner,
          listId,
          items: [{ type: card.type, trakt: card.id }],
          request: request('POST'),
          notify: toast,
        });
        if (!ok) {
          removed.delete(card.key);
          patched = before;
          return;
        }
        const all = await wholeOrder().catch(() => null);
        if (all) {
          await reorderListItems({
            owner,
            listId,
            rank: all.filter((id) => id !== card.key),
            request: request('POST'),
            notify: toast,
            failure: MOVE_FAILED,
          });
        }
        await invalidateAll();
      }),

    /** Reset Ranks: the filtered items, in the page's sort, become the ranks. */
    resetRanks: () =>
      exclusive(async () => {
        const { owner, listId, base, query, sort } = items();
        const refs = await fetchListItemRefs({
          fetch: authenticatedFetch({ manager: userManager() }),
          base,
          query,
          sort,
        });
        if (
          !await reorderListItems({
            owner,
            listId,
            rank: refs.map(({ id }) => id),
            request: request('POST'),
            notify: toast,
          })
        ) return;
        managing = false;
        await invalidateAll();
      }),

    /** Delete: every filtered item, then back to the list's first page like OG's redirect. */
    deleteAll: () =>
      exclusive(async () => {
        const { owner, listId, base, query, list } = items();
        const refs = await fetchListItemRefs({
          fetch: authenticatedFetch({ manager: userManager() }),
          base,
          query,
          sort: { by: 'rank', how: 'asc' },
        });
        if (!await removeListItems({ owner, listId, items: refs, request: request('POST'), notify: toast })) return;
        managing = false;
        toast.success(
          `Deleted ${refs.length.toLocaleString('en-US')} item${refs.length === 1 ? '' : 's'} from ${list.name}!`,
        );
        await goto(resolve('/users/[id]/lists/[list]', { id: list.ownerSlug, list: list.slug }), {
          invalidateAll: true,
        });
      }),

    /** The notes modal's Save. The limit comes back for the modal to show; other failures toast. */
    saveNote: async (card: ListItemCard, notes: string): Promise<{ saved: boolean; limit?: string }> => {
      const { owner, listId } = items();
      const result = await saveListItemNote({ owner, listId, id: card.key, notes, request: request('PUT') });
      if (result.ok) {
        patched = cards.map((item) => item.key === card.key ? { ...item, notes: result.notes || undefined } : item);
        return { saved: true };
      }
      if ('limit' in result) return { saved: false, limit: result.limit };
      toast.error(result.message);
      return { saved: false };
    },
  };
  return manager;
}
