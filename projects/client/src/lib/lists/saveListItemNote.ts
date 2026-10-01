import { listWriteError } from './listWriteError.ts';

type Params = {
  owner: string;
  listId: number;
  /** The list item's id. */
  id: number;
  notes: string;
  request: (path: string, body: unknown) => Promise<Response>;
};

export type SaveListItemNoteResult =
  | { readonly ok: true; readonly notes: string }
  | { readonly ok: false; readonly message: string }
  /** API's account limit (420): the viewer already has this many notes. */
  | { readonly ok: false; readonly limit: string };

/**
 * `PUT /users/:owner/lists/:id/items/:list_item_id` with `notes`,
 * which answers 204. Blank text clears the note.
 */
export async function saveListItemNote({ owner, listId, id, notes, request }: Params): Promise<SaveListItemNoteResult> {
  const text = notes.trim();
  let response: Response | undefined;
  try {
    response = await request(`/users/${encodeURIComponent(owner)}/lists/${listId}/items/${id}`, { notes: text });
    if (response.ok) return { ok: true, notes: text };
    if (response.status === 420) return { ok: false, limit: response.headers.get('x-account-limit') ?? 'the most' };
  } catch {
    // A network failure gets the generic message.
  }
  return { ok: false, message: await listWriteError(response) };
}
