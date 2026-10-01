import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchCollaborators } from './fetchCollaborators.ts';

const ENDPOINT = 'https://apiz.trakt.tv/lists/42/collaborators';
const server = setupServer(
  http.get(ENDPOINT, () =>
    HttpResponse.json([
      { username: 'alex889', name: ' Coco ', ids: { slug: 'alex889' } },
      { username: 'sean', name: null, ids: { slug: null } },
    ])),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchCollaborators', () => {
  it('should name each collaborator like OG', async () => {
    expect(await fetchCollaborators({ fetch, listId: 42 })).toEqual([
      { slug: 'alex889', name: 'Coco' },
      { slug: 'sean', name: 'sean' },
    ]);
  });

  it('should treat a private list, a failure or an odd body as no collaborators', async () => {
    server.use(http.get(ENDPOINT, () => new HttpResponse('List is private or does not exist', { status: 403 })));
    expect(await fetchCollaborators({ fetch, listId: 42 })).toEqual([]);
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ nope: true })));
    expect(await fetchCollaborators({ fetch, listId: 42 })).toEqual([]);
    server.use(http.get(ENDPOINT, () => HttpResponse.error()));
    expect(await fetchCollaborators({ fetch, listId: 42 })).toEqual([]);
  });
});
