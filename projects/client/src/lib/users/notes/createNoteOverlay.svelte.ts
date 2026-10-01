import { saveNote } from '../../notes/saveNote.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import type { NoteView } from './NoteView.ts';

/** Page-scoped edits, with no persisted media slice: fresh data or a viewer change clears them. */
export function createNoteOverlay() {
  let revision = 0;
  let entries = $state<Readonly<Record<number, NoteView | null>>>({});
  let pending = $state<Readonly<Record<number, boolean>>>({});
  const state = (note: NoteView) => Object.hasOwn(entries, note.id) ? entries[note.id] : note;
  return {
    state,
    busy(id: number) {
      return pending[id] === true;
    },
    clear() {
      revision++;
      entries = {};
      pending = {};
    },
    async save({ note, text, fetch, datePreferences, now }: {
      note: NoteView;
      text: string;
      fetch: typeof globalThis.fetch;
      datePreferences: DatePreferences;
      now: string;
    }) {
      if (pending[note.id]) return null;
      const previous = state(note);
      const trimmed = text.trim();
      if (!previous || (trimmed && trimmed === previous.text)) return null;
      const version = revision;
      const updated = {
        ...previous,
        text: trimmed,
        updatedAt: now,
        updatedDate: formatDate(now, { ...datePreferences, time: true }),
      };
      entries = { ...entries, [note.id]: trimmed ? updated : null };
      pending = { ...pending, [note.id]: true };
      const result = await saveNote({
        fetch,
        item: note.item,
        note: {
          id: previous.id,
          text: previous.text,
          updatedAt: previous.updatedAt,
        },
        text: trimmed,
      });
      if (version !== revision) return null;
      pending = { ...pending, [note.id]: false };
      if (!result.ok) entries = { ...entries, [note.id]: previous };
      return result;
    },
  };
}
