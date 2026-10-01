import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeUser } from './fakeUser.ts';
import { fakeUserManager } from './fakeUserManager.ts';
import { syncSession } from './syncSession.ts';

const posted: unknown[] = [];
const server = setupServer(
  http.post('http://localhost/api/store-token', async ({ request }) => {
    posted.push(await request.json());
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => {
  vi.stubGlobal('location', new URL('http://localhost/'));
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  posted.length = 0;
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('syncSession', () => {
  it('should store the token and reload when the server had no cookie', async () => {
    const user = fakeUser('abc', 3600);
    const { manager } = fakeUserManager({ current: user });
    const reload = vi.fn(() => Promise.resolve());

    syncSession({ manager, hasSession: false, reload });

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(posted).toEqual([{ token: 'abc', expiresAt: (user.expires_at ?? 0) * 1000 }]);
  });

  it('should clear the cookie when the browser has no user', async () => {
    const { manager } = fakeUserManager({});
    const reload = vi.fn(() => Promise.resolve());

    syncSession({ manager, hasSession: true, reload });

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(posted).toEqual([{ token: null, expiresAt: null }]);
  });

  it('should leave a cookie that matches the browser alone', async () => {
    const fake = fakeUserManager({ current: fakeUser('abc', 3600) });
    const reload = vi.fn(() => Promise.resolve());

    syncSession({ manager: fake.manager, hasSession: true, reload });

    await vi.waitFor(() => expect(fake.getUser).toHaveBeenCalled());
    expect(posted).toEqual([]);
    expect(reload).not.toHaveBeenCalled();
  });

  it('should renew an expired user', async () => {
    const fake = fakeUserManager({ current: fakeUser('old', -1) });

    syncSession({ manager: fake.manager, hasSession: true, reload: () => Promise.resolve() });

    await vi.waitFor(() => expect(fake.signinSilent).toHaveBeenCalledTimes(1));
  });
});
