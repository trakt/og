import { describe, expect, it } from 'vitest';
import { createNoteOverlay } from './createNoteOverlay.svelte.ts';
import { noteRowsSchema } from './noteRowsSchema.ts';
import { toNote } from './toNote.ts';

const preferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const row = noteRowsSchema.parse([{
  type: 'episode',
  episode: { title: 'Pilot', ids: { trakt: 3 }, season: 1, number: 1 },
  show: { title: 'Breaking Bad', ids: { trakt: 2, slug: 'breaking-bad' } },
  attached_to: { type: 'history', watched_at: '2026-09-29T12:00:00Z' },
  note: { id: 7, notes: 'Old text', privacy: 'friends', spoiler: true, updated_at: '2026-09-29T12:00:00Z' },
}]).at(0);
if (!row) throw new Error('Missing fixture');
const mapped = toNote(row, preferences);
if (!mapped) throw new Error('Invalid fixture');
const note = mapped;
const parameters = { note, datePreferences: preferences, now: '2026-09-30T12:00:00Z' };
function deferred() {
  let respond: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => respond = resolve);
  return { fetch: (() => response) as typeof fetch, respond };
}

describe('createNoteOverlay', () => {
  it('should immediately update text and date while retaining the attachment, privacy and spoiler', async () => {
    const overlay = createNoteOverlay();
    const request = deferred();
    const save = overlay.save({ ...parameters, fetch: request.fetch, text: 'New text' });
    expect(overlay.state(note)).toMatchObject({
      text: 'New text',
      privacy: 'friends',
      spoiler: true,
      activity: note.activity,
      updatedAt: parameters.now,
      updatedDate: 'Sep 30, 2026 12:00 PM',
    });
    expect(overlay.busy(note.id)).toBe(true);
    request.respond(new Response(null, { status: 204 }));
    expect(await save).toMatchObject({ ok: true });
    expect(overlay.busy(note.id)).toBe(false);
  });
  it('should remove immediately and restore the full row on failure', async () => {
    const overlay = createNoteOverlay();
    const request = deferred();
    const save = overlay.save({ ...parameters, fetch: request.fetch, text: '' });
    expect(overlay.state(note)).toBeNull();
    request.respond(new Response(null, { status: 500 }));
    expect(await save).toMatchObject({ ok: false });
    expect(overlay.state(note)).toEqual(note);
  });
  it('should still delete a note whose saved text is empty', async () => {
    const overlay = createNoteOverlay();
    const empty = { ...note, text: '' };
    const success = (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch;
    expect(await overlay.save({ ...parameters, note: empty, fetch: success, text: '' })).toMatchObject({
      ok: true,
      note: null,
    });
    expect(overlay.state(empty)).toBeNull();
  });

  it('should roll back a failed edit and allow retry', async () => {
    const overlay = createNoteOverlay();
    const failedFetch = (() => Promise.reject(new Error('offline'))) as typeof fetch;
    expect(await overlay.save({ ...parameters, fetch: failedFetch, text: 'Changed' })).toMatchObject({ ok: false });
    expect(overlay.state(note)).toEqual(note);
    const success = (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch;
    await overlay.save({ ...parameters, fetch: success, text: 'Retried' });
    expect(overlay.state(note)?.text).toBe('Retried');
  });
  it('should serialize a row and skip unchanged text', async () => {
    const overlay = createNoteOverlay();
    const request = deferred();
    expect(await overlay.save({ ...parameters, fetch: request.fetch, text: 'Old text' })).toBeNull();
    const save = overlay.save({ ...parameters, fetch: request.fetch, text: 'First' });
    expect(await overlay.save({ ...parameters, fetch: request.fetch, text: 'Second' })).toBeNull();
    request.respond(new Response(null, { status: 204 }));
    await save;
    expect(overlay.state(note)?.text).toBe('First');
  });
  it('should discard late failures after navigation or a viewer change', async () => {
    const overlay = createNoteOverlay();
    const request = deferred();
    const save = overlay.save({ ...parameters, fetch: request.fetch, text: 'Changed' });
    overlay.clear();
    request.respond(new Response(null, { status: 500 }));
    expect(await save).toBeNull();
    expect(overlay.state(note)).toEqual(note);
    expect(overlay.busy(note.id)).toBe(false);
  });
});
