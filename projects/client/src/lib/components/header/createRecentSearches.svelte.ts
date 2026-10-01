import type { z } from 'zod/v4';
import { recentSearchesSchema } from './recentSearchesSchema.ts';

type Term = z.infer<typeof recentSearchesSchema>['user'][number];
type Params = {
  viewer: string | null;
  request: (path: string, body?: unknown) => Promise<Response>;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  notify: (message: string) => void;
  now?: () => number;
};
const key = (term: Term) => JSON.stringify([term.query.trim().toLowerCase(), term.type ?? '']);
const unique = (terms: ReadonlyArray<Term>) =>
  terms.filter((term, index) => terms.findIndex((other) => key(other) === key(term)) === index).slice(0, 5);
// Every open list, so Clear Search History can empty the header's without a reload.
let live: ReadonlyArray<() => void> = [];

/** Empties every open recent searches list and its browser copy. Call it once the API's clear went through. */
export function clearRecentSearches() {
  live.forEach((clear) => clear());
}

/** Browser-only query history. It never changes media overlay membership. */
export function createRecentSearches({ viewer, request, storage, notify, now = Date.now }: Params) {
  const storageKey = `og-recent-searches:${viewer}`;
  let local: ReadonlyArray<Term> = [];
  try {
    const saved = storage?.getItem(storageKey);
    if (viewer && saved) local = recentSearchesSchema.shape.user.parse(JSON.parse(saved));
  } catch { /* Storage is optional; memory still works. */ }
  let user = $state<ReadonlyArray<Term>>(unique(local));
  let global = $state<ReadonlyArray<Term>>([]);
  let loaded = $state(false);
  let busy = $state(false);
  let loading: Promise<void> | undefined;
  let active = true;
  let removed: ReadonlyArray<string> = [];
  let writing = Promise.resolve();
  // Bumped by a clear, so a read or a rollback started before it can't bring the cleared queries back.
  let generation = 0;
  const serialize = (action: () => Promise<void>) => {
    writing = writing.then(action);
    return writing;
  };

  const persist = () => {
    try {
      storage?.setItem(storageKey, JSON.stringify(local));
    } catch { /* Memory-only when storage is unavailable. */ }
  };
  const clear = () => {
    if (!viewer) return;
    generation += 1;
    user = [];
    local = [];
    removed = [];
    persist();
  };
  live = [...live, clear];

  return {
    dispose() {
      active = false;
      live = live.filter((other) => other !== clear);
      user = [];
      global = [];
    },
    get user() {
      return viewer ? user : [];
    },
    get global() {
      return global;
    },
    get loaded() {
      return loaded;
    },
    get busy() {
      return busy;
    },
    load() {
      if (!active || loaded) return Promise.resolve();
      return loading ??= (async () => {
        const started = generation;
        try {
          const response = await request('/search/recent');
          if (!active || !response.ok) return;
          const data = recentSearchesSchema.parse(await response.json());
          await writing;
          // A clear meanwhile leaves it unloaded, so the next focus reads the emptied history.
          if (!active || started !== generation) return;
          user = unique(
            [...local, ...data.user].filter((term) => !removed.includes(key(term)))
              .toSorted((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)),
          );
          global = data.global;
          loaded = true;
        } catch {
          /* Autocomplete remains available if history fails. */
        } finally {
          loading = undefined;
        }
      })();
    },
    remove(term: Term) {
      if (!viewer || busy) return Promise.resolve();
      return serialize(async () => {
        if (!active) return;
        busy = true;
        const previous = user;
        const started = generation;
        user = user.filter((item) => key(item) !== key(term));
        try {
          const response = await request('/search/recent/remove', { query: term.query, type: term.type ?? '' });
          if (!active) return;
          if (!response.ok) throw new Error('Remove failed');
          removed = [...removed, key(term)];
          local = local.filter((item) => key(item) !== key(term));
          persist();
        } catch {
          if (!active) return;
          if (started === generation) user = previous;
          notify('Doh! We could not remove this recent search.');
        } finally {
          busy = false;
        }
      });
    },
    record({ query, type, id }: { query: string; type: string; id: number }) {
      if (!viewer || !query.trim() || id <= 0) return Promise.resolve();
      return serialize(async () => {
        if (!active) return;
        busy = true;
        const previous = user;
        const started = generation;
        const term = { query: query.trim(), type, created_at: Math.floor(now() / 1000) };
        user = unique([term, ...user]);
        try {
          const response = await request('/search/recent', { query: term.query, type, id });
          if (!active) return;
          if (!response.ok) throw new Error('Record failed');
          // The worker consumes JSON before proxying it to API. Keep picked queries per account in this browser
          // until that upstream path preserves the body; the POST still records the native by-id trending count.
          removed = removed.filter((value) => value !== key(term));
          local = unique([term, ...local]);
          persist();
        } catch {
          if (!active) return;
          if (started === generation) user = previous;
          notify('Doh! We could not save this recent search.');
        } finally {
          busy = false;
        }
      });
    },
  };
}
