import type { ReactionsSummaryResponse } from '@trakt/api';
import { z } from 'zod/v4';
import { loadCommentReactions } from './loadCommentReactions.ts';
import { patchReactionSummary } from './patchReactionSummary.ts';
import type { reactionTypeSchema } from './reactionTypeSchema.ts';

type Reaction = z.infer<typeof reactionTypeSchema>;
type SummaryReader = (id: number, fresh?: boolean) => Promise<ReactionsSummaryResponse | undefined>;
const empty = (): ReactionsSummaryResponse => ({ reaction_count: 0, user_count: 0, distribution: {} });
const errorSchema = z.object({ message: z.string() });
const unknownError = 'Doh! We ran into some sort of error.';

/** Client-only session state: one viewer read, shared per-comment choices, totals and serialized optimistic writes. */
export function createCommentReactions({ request, notify }: {
  request: (path: string, init?: RequestInit) => Promise<Response>;
  notify: (message: string) => void;
}) {
  let viewer: string | null = null;
  let generation = $state(0);
  let loaded = $state(false);
  let choices = $state<Readonly<Record<number, Reaction>>>({});
  let summaries = $state<Readonly<Record<number, ReactionsSummaryResponse>>>({});
  let busy = $state<Readonly<Record<number, boolean>>>({});
  let loading: Promise<boolean> | undefined;
  // Pending promises are bookkeeping, not UI state.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const summaryRequests = new Map<number, Promise<void>>();

  const start = (sub: string | null): Promise<boolean> => {
    if (viewer === sub) return loading ?? Promise.resolve(loaded);
    viewer = sub;
    const current = ++generation;
    loaded = false;
    choices = {};
    busy = {};
    // A previous session's pending patches must not survive a viewer change.
    summaries = {};
    summaryRequests.clear();
    if (!sub) {
      loading = undefined;
      return Promise.resolve(false);
    }
    loading = loadCommentReactions(request).then((rows) => {
      if (current !== generation) return false;
      choices = Object.fromEntries(rows);
      loaded = true;
      return true;
    }).catch(() => false);
    return loading;
  };

  const loadSummary = (id: number, likes: number, read: SummaryReader, session = generation): Promise<void> => {
    if (session !== generation) return Promise.resolve();
    if (summaries[id] !== undefined) return Promise.resolve();
    const pending = summaryRequests.get(id);
    if (pending) return pending;
    if (likes <= 0) {
      summaries = { ...summaries, [id]: empty() };
      return Promise.resolve();
    }
    const current = generation;
    const task = read(id).then((summary) => {
      if (current === generation && summary) summaries = { ...summaries, [id]: summary };
    }).catch(() => {}).finally(() => {
      if (current === generation) summaryRequests.delete(id);
    });
    summaryRequests.set(id, task);
    return task;
  };

  const ready = async () => {
    const result = await loading;
    if (result && loaded) return true;
    notify('Doh! We could not load your reactions. Please reload and try again.');
    return false;
  };

  // Patches only this comment; another card's concurrent change survives a rollback.
  const patch = (id: number, next: Reaction | undefined) => {
    const previous = choices[id];
    const oldSummary = summaries[id];
    const choose = (choice: Reaction | undefined) => {
      const updated = Object.fromEntries(Object.entries(choices).filter(([key]) => key !== String(id)));
      choices = choice ? { ...updated, [id]: choice } : updated;
    };
    choose(next);
    if (oldSummary) {
      summaries = { ...summaries, [id]: patchReactionSummary({ summary: oldSummary, previous, next }) };
    }
    return () => {
      choose(previous);
      if (oldSummary) summaries = { ...summaries, [id]: oldSummary };
    };
  };

  const change = async ({ id, type, likes, read }: {
    id: number;
    type: Reaction;
    likes: number;
    read: SummaryReader;
  }): Promise<boolean> => {
    if (busy[id] === true || !loaded) return false;
    const current = generation;
    busy = { ...busy, [id]: true };
    await loadSummary(id, likes, read);
    if (current !== generation) return false;
    const previous = choices[id];
    const next = previous === type ? undefined : type;
    const rollback = patch(id, next);
    let message = unknownError;
    try {
      // API's typed delete also unlikes; delete-all skips that step.
      const response = await request(`/comments/${id}/reactions/${type}`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!response.ok) {
        const body = errorSchema.safeParse(await response.json().catch(() => null));
        message = body.success
          ? body.data.message
          : response.status === 409
          ? 'Doh! You are banned from reacting.'
          : unknownError;
        throw new Error(message);
      }
      // Both writes return no content. Re-read the public summary to reconcile concurrent members' reactions.
      const summary = await read(id, true).catch(() => undefined);
      if (current === generation && summary) summaries = { ...summaries, [id]: summary };
      return true;
    } catch {
      if (current !== generation) return false;
      rollback();
      notify(message);
      return false;
    } finally {
      if (current === generation) busy = { ...busy, [id]: false };
    }
  };

  return {
    get session() {
      return generation;
    },
    start,
    ready,
    loadSummary,
    change,
    state: (id: number) => ({ reaction: choices[id], summary: summaries[id], busy: busy[id] === true }),
  };
}
