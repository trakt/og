import { describe, expect, it, vi } from 'vitest';
import { clearRecentSearches, createRecentSearches } from './createRecentSearches.svelte.ts';

const history = {
  user: [{ query: 'Breaking', type: 'shows' }, { query: 'Fight Club', type: 'movies' }],
  global: [{ query: 'The Office', type: 'shows' }],
} as const;
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('createRecentSearches', () => {
  it('should load API queries once and hide user history for logged-out viewers', async () => {
    const request = vi.fn(() => Promise.resolve(Response.json(history)));
    const recent = createRecentSearches({ viewer: null, request, notify: vi.fn() });
    await Promise.all([recent.load(), recent.load()]);
    await recent.load();
    expect(request).toHaveBeenCalledTimes(1);
    expect(recent.user).toEqual([]);
    expect(recent.global).toEqual(history.global);
    await recent.record({ query: 'ignored', type: 'shows', id: 1 });
    await recent.remove(history.user[0]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should reject malformed history and retry without breaking autocomplete', async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ user: [{ query: 42 }], global: [] }))
      .mockResolvedValueOnce(Response.json(history));
    const recent = createRecentSearches({ viewer: 'one', request, notify: vi.fn() });
    await recent.load();
    expect(recent.loaded).toBe(false);
    expect(recent.user).toEqual([]);
    await recent.load();
    expect(recent.user).toEqual(history.user);
  });

  it('should keep picked queries across browser loads, deduplicate and scope them to an account', async () => {
    const saved = storage();
    const request = vi.fn((path: string) =>
      Promise.resolve(path === '/search/recent' ? Response.json(history) : new Response(null, { status: 204 }))
    );
    const recent = createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() });
    await recent.load();
    // POST /search/recent shares the read path, so provide the worker's empty 201 response.
    request.mockImplementation(() => Promise.resolve(new Response(null, { status: 201 })));
    await recent.record({ query: ' breaking ', type: 'shows', id: 1388 });
    expect(request).toHaveBeenLastCalledWith('/search/recent', { query: 'breaking', type: 'shows', id: 1388 });
    expect(recent.user.map((term) => term.query)).toEqual(['breaking', 'Fight Club']);
    const reloaded = createRecentSearches({
      viewer: 'one',
      request: () => Promise.resolve(Response.json(history)),
      storage: saved,
      notify: vi.fn(),
    });
    await reloaded.load();
    expect(reloaded.user.map((term) => term.query)).toEqual(['breaking', 'Fight Club']);
    expect(createRecentSearches({ viewer: 'two', request, storage: saved, notify: vi.fn() }).user).toEqual([]);
    for (let id = 1; id <= 6; id++) await recent.record({ query: `query ${id}`, type: '', id });
    expect(recent.user.map((term) => term.query)).toEqual(['query 6', 'query 5', 'query 4', 'query 3', 'query 2']);
  });

  it('should remove optimistically and restore the original order with a toast when the write fails', async () => {
    let finish: (response: Response) => void = () => {};
    const notify = vi.fn();
    const recent = createRecentSearches({
      viewer: 'one',
      notify,
      request: (path) =>
        path === '/search/recent' ? Promise.resolve(Response.json(history)) : new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await recent.load();
    const removing = recent.remove(history.user[0]);
    await Promise.resolve();
    expect(recent.user).toEqual([history.user[1]]);
    expect(recent.busy).toBe(true);
    finish(new Response(null, { status: 500 }));
    await removing;
    expect(recent.user).toEqual(history.user);
    expect(recent.busy).toBe(false);
    expect(notify).toHaveBeenCalledOnce();
  });

  it('should remove a saved local query permanently and keep memory working when storage throws', async () => {
    const saved = storage();
    const request = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    const recent = createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() });
    await recent.record({ query: 'Breaking', type: '', id: 1388 });
    await recent.remove({ query: 'Breaking', type: '' });
    expect(request).toHaveBeenLastCalledWith('/search/recent/remove', { query: 'Breaking', type: '' });
    expect(createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() }).user).toEqual([]);
    const unavailable = {
      getItem: () => {
        throw new Error('Private');
      },
      setItem: () => {
        throw new Error('Quota');
      },
    };
    const memory = createRecentSearches({ viewer: 'one', request, storage: unavailable, notify: vi.fn() });
    await memory.record({ query: 'Breaking', type: '', id: 1388 });
    expect(memory.user[0]?.query).toBe('Breaking');
  });

  it('should serialize picks so a slow older write cannot discard a newer query', async () => {
    let finish: (response: Response) => void = () => {};
    const request = vi.fn().mockImplementationOnce(() =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      })
    )
      .mockResolvedValue(new Response(null, { status: 201 }));
    const recent = createRecentSearches({ viewer: 'one', request, notify: vi.fn() });
    const first = recent.record({ query: 'First', type: 'movies', id: 1 });
    const second = recent.record({ query: 'Second', type: 'shows', id: 2 });
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    finish(new Response(null, { status: 500 }));
    await Promise.all([first, second]);
    expect(recent.user.map((term) => term.query)).toEqual(['Second']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('should put newer server queries ahead of older browser picks', async () => {
    const saved = storage();
    saved.setItem('og-recent-searches:one', JSON.stringify([{ query: 'Old', type: '', created_at: 100 }]));
    const recent = createRecentSearches({
      viewer: 'one',
      storage: saved,
      notify: vi.fn(),
      request: () =>
        Promise.resolve(Response.json({ user: [{ query: 'New', type: '', created_at: 200 }], global: [] })),
    });
    await recent.load();
    expect(recent.user.map((term) => term.query)).toEqual(['New', 'Old']);
  });

  it('should discard late reads and queued picks after the viewer changes', async () => {
    let finish: (response: Response) => void = () => {};
    const request = vi.fn(() =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      })
    );
    const recent = createRecentSearches({ viewer: 'old', request, notify: vi.fn() });
    const reading = recent.load();
    recent.dispose();
    finish(Response.json(history));
    await reading;
    await recent.record({ query: 'Old account', type: 'shows', id: 1 });
    expect(recent.user).toEqual([]);
    expect(recent.global).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('should not resurrect a removed query when the initial read arrives late', async () => {
    const saved = storage();
    saved.setItem('og-recent-searches:one', JSON.stringify(history.user));
    let finish: (response: Response) => void = () => {};
    const recent = createRecentSearches({
      viewer: 'one',
      storage: saved,
      notify: vi.fn(),
      request: (path) =>
        path.endsWith('/remove')
          ? Promise.resolve(new Response(null, { status: 204 }))
          : new Promise<Response>((resolve) => {
            finish = resolve;
          }),
    });
    const reading = recent.load();
    await recent.remove(history.user[0]);
    finish(Response.json(history));
    await reading;
    expect(recent.user).toEqual([history.user[1]]);
  });

  it('should roll back a failed record without saving it locally', async () => {
    const saved = storage();
    const notify = vi.fn();
    const request = vi.fn(() => Promise.resolve(new Response(null, { status: 403 })));
    const recent = createRecentSearches({ viewer: 'one', request, storage: saved, notify });
    await recent.record({ query: 'Breaking', type: '', id: 1388 });
    expect(recent.user).toEqual([]);
    expect(notify).toHaveBeenCalledOnce();
    expect(saved.getItem('og-recent-searches:one')).toBeNull();
  });

  it('should empty every open list and its browser copy when the history is cleared', async () => {
    const saved = storage();
    saved.setItem('og-recent-searches:one', JSON.stringify([{ query: 'Local', type: '' }]));
    const request = vi.fn(() => Promise.resolve(Response.json(history)));
    const open = createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() });
    await open.load();
    const gone = createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() });
    gone.dispose();
    clearRecentSearches();
    expect(open.user).toEqual([]);
    expect(open.global).toEqual(history.global);
    expect(createRecentSearches({ viewer: 'one', request, storage: saved, notify: vi.fn() }).user).toEqual([]);
    request.mockImplementation(() => Promise.resolve(new Response(null, { status: 201 })));
    await open.record({ query: 'Fresh', type: '', id: 1 });
    expect(open.user.map((term) => term.query)).toEqual(['Fresh']);
    open.dispose();
  });

  it('should not bring cleared queries back from a read or a failed remove still in flight', async () => {
    let finishRead: (response: Response) => void = () => {};
    let finishRemove: (response: Response) => void = () => {};
    const notify = vi.fn();
    const recent = createRecentSearches({
      viewer: 'one',
      notify,
      request: (path) =>
        new Promise<Response>((resolve) => {
          if (path.endsWith('/remove')) finishRemove = resolve;
          else finishRead = resolve;
        }),
    });
    const reading = recent.load();
    clearRecentSearches();
    finishRead(Response.json(history));
    await reading;
    expect(recent.user).toEqual([]);
    expect(recent.loaded).toBe(false);
    const loading = recent.load();
    finishRead(Response.json(history));
    await loading;
    const removing = recent.remove(history.user[0]);
    await Promise.resolve();
    clearRecentSearches();
    finishRemove(new Response(null, { status: 500 }));
    await removing;
    expect(recent.user).toEqual([]);
    expect(notify).toHaveBeenCalledOnce();
    recent.dispose();
  });
});
