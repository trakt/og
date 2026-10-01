import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createCommentReactions } from './createCommentReactions.svelte.ts';

const base = 'https://reactions.test';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const total = { reaction_count: 5, user_count: 5, distribution: { like: 2, love: 1, laugh: 1, bravo: 1 } };
function create() {
  const messages: string[] = [];
  return {
    store: createCommentReactions({
      request: (path, init) => fetch(base + path, init),
      notify: (message) => messages.push(message),
    }),
    messages,
  };
}
function viewer() {
  server.use(http.get(`${base}/users/reactions/comments`, () =>
    HttpResponse.json([
      { comment: { id: 2 }, reaction: { type: 'like', emoji: '👍' } },
    ])));
}

describe('createCommentReactions', () => {
  it('should load every page once per viewer and share the selected reaction', async () => {
    const { store } = create();
    const pages: string[] = [];
    server.use(http.get(`${base}/users/reactions/comments`, ({ request }) => {
      const url = new URL(request.url);
      expect(url.searchParams.get('extended')).toBe('min');
      const page = url.searchParams.get('page') ?? '';
      pages.push(page);
      return HttpResponse.json([
        { comment: { id: Number(page) }, reaction: { type: page === '1' ? 'like' : 'love' } },
      ], { headers: { 'x-pagination-page-count': '2' } });
    }));
    await Promise.all([store.start('one'), store.start('one')]);
    expect(pages).toEqual(['1', '2']);
    expect(store.state(2).reaction).toBe('love');
    await store.start('one');
    expect(pages).toHaveLength(2);
    await store.start('two');
    expect(pages).toHaveLength(4);
  });

  it('should refuse a write when the viewer response is malformed', async () => {
    server.use(http.get(`${base}/users/reactions/comments`, () =>
      HttpResponse.json([
        { comment: { id: 2 }, reaction: { type: 'unknown' } },
      ])));
    const { store, messages } = create();
    await store.start('one');
    expect(await store.ready()).toBe(false);
    expect(await store.change({ id: 2, type: 'like', likes: 0, read: () => Promise.resolve(total) })).toBe(false);
    expect(messages).toEqual(['Doh! We could not load your reactions. Please reload and try again.']);
  });

  it('should skip zero-like summaries and share concurrent summary reads', async () => {
    const { store } = create();
    let calls = 0;
    const read = () => {
      calls++;
      return Promise.resolve(total);
    };
    await store.loadSummary(1, 0, read);
    expect(calls).toBe(0);
    await Promise.all([store.loadSummary(2, 5, read), store.loadSummary(2, 5, read)]);
    expect(calls).toBe(1);
    expect(store.state(2).summary).toEqual(total);
  });

  it('should optimistically replace a choice, serialize taps and reconcile the server totals', async () => {
    viewer();
    const { store } = create();
    await store.start('one');
    await store.loadSummary(2, 5, () => Promise.resolve(total));
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: () => void = () => {};
    const writing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    server.use(http.post(`${base}/comments/2/reactions/love`, async () => {
      entered();
      await gate;
      return new HttpResponse(null, { status: 204 });
    }));
    const fresh = {
      ...total,
      reaction_count: 6,
      user_count: 6,
      distribution: { like: 1, love: 3, laugh: 1, bravo: 1 },
    };
    const result = store.change({ id: 2, type: 'love', likes: 5, read: () => Promise.resolve(fresh) });
    await writing;
    expect(store.state(2)).toEqual({
      reaction: 'love',
      busy: true,
      summary: { ...total, distribution: { like: 1, love: 2, laugh: 1, bravo: 1 } },
    });
    expect(await store.change({ id: 2, type: 'laugh', likes: 5, read: () => Promise.resolve(fresh) })).toBe(false);
    release();
    expect(await result).toBe(true);
    expect(store.state(2).summary).toEqual(fresh);
    expect(store.state(2).busy).toBe(false);
  });

  it('should remove the selected choice with DELETE and decrement the summary', async () => {
    viewer();
    const { store } = create();
    await store.start('one');
    await store.loadSummary(2, 5, () => Promise.resolve(total));
    server.use(http.delete(`${base}/comments/2/reactions/like`, () => new HttpResponse(null, { status: 204 })));
    expect(await store.change({ id: 2, type: 'like', likes: 5, read: () => Promise.resolve(undefined) })).toBe(true);
    expect(store.state(2)).toEqual({
      reaction: undefined,
      busy: false,
      summary: { reaction_count: 4, user_count: 4, distribution: { like: 1, love: 1, laugh: 1, bravo: 1 } },
    });
  });

  it('should show a first reaction even when the original card had zero likes', async () => {
    server.use(http.get(`${base}/users/reactions/comments`, () => HttpResponse.json([])));
    server.use(http.post(`${base}/comments/2/reactions/spoiler`, () => new HttpResponse(null, { status: 204 })));
    const { store } = create();
    await store.start('one');
    expect(await store.change({ id: 2, type: 'spoiler', likes: 0, read: () => Promise.resolve(undefined) })).toBe(true);
    expect(store.state(2).summary).toEqual({ reaction_count: 1, user_count: 1, distribution: { spoiler: 1 } });
  });

  it.each([
    [409, {}, 'Doh! You are banned from reacting.'],
    [422, { message: 'Invalid reaction type' }, 'Invalid reaction type'],
    [500, '<html>Error</html>', 'Doh! We ran into some sort of error.'],
  ])('should roll back a failed write (%s) and toast its parsed error', async (status, body, message) => {
    viewer();
    server.use(http.post(`${base}/comments/2/reactions/love`, () => HttpResponse.json(body, { status })));
    const { store, messages } = create();
    await store.start('one');
    await store.loadSummary(2, 5, () => Promise.resolve(total));
    expect(await store.change({ id: 2, type: 'love', likes: 5, read: () => Promise.resolve(total) })).toBe(false);
    expect(store.state(2)).toEqual({ reaction: 'like', summary: total, busy: false });
    expect(messages).toEqual([message]);
  });

  it('should discard an old viewer load after logout', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(http.get(`${base}/users/reactions/comments`, async () => {
      await gate;
      return HttpResponse.json([{ comment: { id: 2 }, reaction: { type: 'love' } }]);
    }));
    const { store } = create();
    const started = store.start('one');
    await store.start(null);
    release();
    expect(await started).toBe(false);
    expect(store.state(2).reaction).toBeUndefined();
  });

  it('should discard a failed old viewer write after switching accounts', async () => {
    viewer();
    const { store, messages } = create();
    await store.start('one');
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: () => void = () => {};
    const writing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    server.use(http.post(`${base}/comments/2/reactions/love`, async () => {
      entered();
      await gate;
      return HttpResponse.json({}, { status: 409 });
    }));
    const saving = store.change({ id: 2, type: 'love', likes: 5, read: () => Promise.resolve(total) });
    await writing;
    await store.start(null);
    release();
    expect(await saving).toBe(false);
    expect(store.state(2)).toEqual({ reaction: undefined, summary: undefined, busy: false });
    expect(messages).toEqual([]);
  });
  it('should keep another comment’s successful reaction when a pending change rolls back', async () => {
    viewer();
    const { store } = create();
    await store.start('one');
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: () => void = () => {};
    const writing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    server.use(
      http.post(`${base}/comments/2/reactions/love`, async () => {
        entered();
        await gate;
        return HttpResponse.json({}, { status: 500 });
      }),
      http.post(`${base}/comments/25/reactions/bravo`, () => new HttpResponse(null, { status: 204 })),
    );
    const failing = store.change({ id: 2, type: 'love', likes: 5, read: () => Promise.resolve(total) });
    await writing;
    await store.change({ id: 25, type: 'bravo', likes: 0, read: () => Promise.resolve(undefined) });
    release();
    expect(await failing).toBe(false);
    expect(store.state(2).reaction).toBe('like');
    expect(store.state(25)).toEqual({
      reaction: 'bravo',
      busy: false,
      summary: { reaction_count: 1, user_count: 1, distribution: { bravo: 1 } },
    });
  });
});
