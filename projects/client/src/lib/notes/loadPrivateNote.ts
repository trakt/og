import { z } from 'zod/v4';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { noteRowsSchema } from '../users/notes/noteRowsSchema.ts';
import type { NotableItem } from './NotableItem.ts';
import type { PrivateNote } from './PrivateNote.ts';

type LoadPrivateNoteParams = {
  fetch: typeof fetch;
  token: string | null;
  item: Pick<NotableItem, 'type' | 'id' | 'slug'>;
};

// v3 has no `@trakt/api` contract. Its rows include the favorites-list note (`type: 'favorites'`), which isn't this one.
const v3NotesSchema = z.array(z.object({
  id: z.number(),
  notes: z.string().nullish(),
  updated_at: z.string().nullish(),
  type: z.string(),
}));

const json = (response: Response): Promise<unknown> =>
  response.ok ? response.json().catch(() => null) : Promise.resolve(null);

async function personNote(fetch: typeof globalThis.fetch, token: string, id: number) {
  // v3 only serves movies and shows. For people, API's listing returns every person note in one call.
  const response = await rawApiFetch({ fetch, token, path: '/users/me/notes/people?limit=all' });
  const note = noteRowsSchema.safeParse(await json(response)).data?.find((row) => row.person?.ids.trakt === id)?.note;
  return note ? { id: note.id, text: note.notes ?? '', updatedAt: note.updated_at } : null;
}

async function mediaNote(fetch: typeof globalThis.fetch, token: string, { type, slug }: LoadPrivateNoteParams['item']) {
  const response = await rawApiFetch({ fetch, token, path: `/v3/users/me/notes/${type}/${encodeURIComponent(slug)}` });
  const note = v3NotesSchema.safeParse(await json(response)).data?.find((row) => row.type === 'note');
  return note ? { id: note.id, text: note.notes ?? '', updatedAt: note.updated_at ?? null } : null;
}

/**
 * The viewer's private note on a summary page's item, or null when logged out, when there's none, or when the read
 * fails (a stale token gets a 401 and the page renders the "Add" tile). Saving upserts, so a missed read can't duplicate.
 */
export function loadPrivateNote({ fetch, token, item }: LoadPrivateNoteParams): Promise<PrivateNote | null> {
  if (!token) return Promise.resolve(null);
  const read = item.type === 'person' ? personNote(fetch, token, item.id) : mediaNote(fetch, token, item);
  return read.catch(() => null);
}
