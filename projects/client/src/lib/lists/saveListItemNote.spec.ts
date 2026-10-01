import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { saveListItemNote } from './saveListItemNote.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const endpoint = 'https://apiz.trakt.tv/users/sean/lists/7/items/42';
const save = (notes: string) =>
  saveListItemNote({
    owner: 'sean',
    listId: 7,
    id: 42,
    notes,
    request: (path, body) =>
      rawApiFetch({ fetch, token: 'viewer', path, init: { method: 'PUT', body: JSON.stringify(body) } }),
  });

describe('saveListItemNote', () => {
  it('should save the trimmed note', async () => {
    server.use(http.put(endpoint, async ({ request }) => {
      expect(await request.json()).toEqual({ notes: 'Watch it twice' });
      return new HttpResponse(null, { status: 204 });
    }));
    await expect(save('  Watch it twice ')).resolves.toEqual({ ok: true, notes: 'Watch it twice' });
  });

  it('should explain the account limit', async () => {
    server.use(
      http.put(endpoint, () => new HttpResponse(null, { status: 420, headers: { 'X-Account-Limit': '100' } })),
    );
    await expect(save('More')).resolves.toEqual({ ok: false, limit: '100' });
  });

  it("should fail with the API's message", async () => {
    server.use(http.put(endpoint, () => HttpResponse.json({ message: 'Not found.' }, { status: 404 })));
    await expect(save('More')).resolves.toEqual({ ok: false, message: 'Not found.' });
  });
});
