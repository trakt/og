import type { toNote } from './toNote.ts';

export type NoteView = NonNullable<ReturnType<typeof toNote>>;
