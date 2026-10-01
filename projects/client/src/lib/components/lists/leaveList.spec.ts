import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { leaveList } from './leaveList.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('leaveList', () => {
  it('should remove the viewer through the native route after patching permissions', async () => {
    let left = false;
    const notify = vi.fn();
    server.use(http.delete('https://apiz.trakt.tv/lists/7/collaborators/my%20slug', () => {
      expect(left).toBe(true);
      return new HttpResponse(null, { status: 204 });
    }));
    expect(
      await leaveList({
        fetch,
        id: 7,
        viewer: 'my slug',
        notify,
        patch: () => {
          left = true;
          return () => {
            left = false;
          };
        },
      }),
    ).toBe(true);
    expect(left).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });
  it.each([200, 401, 403, 404, 500])('should restore collaboration on unexpected status %i', async (status) => {
    server.use(http.delete('https://apiz.trakt.tv/lists/7/collaborators/me', () => new HttpResponse(null, { status })));
    const rollback = vi.fn();
    const notify = vi.fn();
    expect(await leaveList({ fetch, id: 7, viewer: 'me', notify, patch: () => rollback })).toBe(false);
    expect(rollback).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledOnce();
  });
});
