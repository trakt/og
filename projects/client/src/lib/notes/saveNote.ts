import { z } from 'zod/v4';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { NotableItem } from './NotableItem.ts';
import type { PrivateNote } from './PrivateNote.ts';

type SaveNoteParams = {
  /** `authenticatedFetch` in the browser. */
  fetch: typeof fetch;
  item: Pick<NotableItem, 'type' | 'id'>;
  note: PrivateNote | null;
  text: string;
};

type SaveNoteResult =
  | { readonly ok: true; readonly note: PrivateNote | null }
  | { readonly ok: false; readonly message: string };

const FAILED = 'Doh! We ran into some sort of error.';
const writtenNote = z.object({
  id: z.number().int().positive(),
  notes: z.string().nullish(),
  updated_at: z.iso.datetime({ offset: true }).nullish(),
});

/** Native writes address any owned note by id; only creation needs API's all-media endpoint. */
export async function saveNote({ fetch, item, note, text }: SaveNoteParams): Promise<SaveNoteResult> {
  const notes = text.trim();
  if (!notes && !note) return { ok: true, note: null };
  try {
    const response = await rawApiFetch({
      fetch,
      path: note ? `/v3/users/me/notes/${note.id}` : '/notes',
      init: {
        method: !notes ? 'DELETE' : note ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          note ? { type: 'note', ...(!notes ? {} : { notes }) } : {
            [item.type]: { ids: { trakt: item.id } },
            notes,
          },
        ),
      },
    });
    if (note && response.status === 204) {
      return { ok: true, note: notes ? { ...note, text: notes, updatedAt: new Date().toISOString() } : null };
    }
    if (response.status === 420) {
      return {
        ok: false,
        message: `You've already added ${response.headers.get('x-account-limit') ?? 'the most'} notes.`,
      };
    }
    if (note || response.status !== 201) return { ok: false, message: FAILED };
    const parsed = writtenNote.safeParse(await response.json().catch(() => null));
    if (!parsed.success) return { ok: false, message: FAILED };
    return {
      ok: true,
      note: { id: parsed.data.id, text: parsed.data.notes ?? '', updatedAt: parsed.data.updated_at ?? null },
    };
  } catch {
    return { ok: false, message: FAILED };
  }
}
