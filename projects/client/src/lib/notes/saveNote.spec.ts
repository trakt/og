import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { saveNote } from './saveNote.ts';

const seen: { method: string; path: string; body: unknown }[] = [];
const record = async (request: Request) => {
  const text = await request.text();
  seen.push({ method: request.method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : null });
};
const saved = { id: 5, notes: 'Saved text', privacy: 'private', updated_at: '2026-09-29T12:00:00.000Z' };
const server = setupServer(
  http.post('https://apiz.trakt.tv/notes', async ({ request }) => {
    await record(request);
    return HttpResponse.json(saved, { status: 201 });
  }),
  http.put('https://apiz.trakt.tv/v3/users/me/notes/:id', async ({ request }) => {
    await record(request);
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('https://apiz.trakt.tv/v3/users/me/notes/:id', async ({ request }) => {
    await record(request);
    return new HttpResponse(null, { status: 204 });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const existing = { id: 5, text: 'Old', updatedAt: null };
const person = { type: 'person', id: 2 } as const;

describe('saveNote', () => {
  it('should create a note on the item type', async () => {
    const result = await saveNote({ fetch, item: person, note: null, text: '  New note \n' });
    expect(seen).toEqual([{
      method: 'POST',
      path: '/notes',
      body: { person: { ids: { trakt: 2 } }, notes: 'New note' },
    }]);
    expect(result).toEqual({ ok: true, note: { id: 5, text: 'Saved text', updatedAt: '2026-09-29T12:00:00.000Z' } });
  });

  it('should update an existing note by id', async () => {
    await saveNote({ fetch, item: person, note: existing, text: 'Changed' });
    expect(seen).toEqual([{ method: 'PUT', path: '/v3/users/me/notes/5', body: { type: 'note', notes: 'Changed' } }]);
  });

  it('should delete an existing note saved blank', async () => {
    const result = await saveNote({ fetch, item: person, note: existing, text: '   ' });
    expect(seen.map(({ method, path }) => `${method} ${path}`)).toEqual(['DELETE /v3/users/me/notes/5']);
    expect(result).toEqual({ ok: true, note: null });
    expect(seen.at(0)?.body).toEqual({ type: 'note' });
  });

  it('should reject malformed API creation responses', async () => {
    server.use(http.post('https://apiz.trakt.tv/notes', () => HttpResponse.json({ id: 'bad' }, { status: 201 })));
    expect(await saveNote({ fetch, item: person, note: null, text: 'New' })).toMatchObject({ ok: false });
  });

  it('should do nothing for a blank new note', async () => {
    expect(await saveNote({ fetch, item: person, note: null, text: '' })).toEqual({ ok: true, note: null });
    expect(seen).toHaveLength(0);
  });

  it('should explain the account limit', async () => {
    server.use(
      http.post(
        'https://apiz.trakt.tv/notes',
        () => new HttpResponse(null, { status: 420, headers: { 'X-Account-Limit': '100' } }),
      ),
    );
    expect(await saveNote({ fetch, item: person, note: null, text: 'One more' }))
      .toEqual({ ok: false, message: "You've already added 100 notes." });
  });

  it("should fail with OG's error on anything else", async () => {
    server.use(http.put('https://apiz.trakt.tv/v3/users/me/notes/:id', () => new HttpResponse(null, { status: 500 })));
    expect(await saveNote({ fetch, item: person, note: existing, text: 'x' }))
      .toEqual({ ok: false, message: 'Doh! We ran into some sort of error.' });
  });
});
