import { describe, expect, it, vi } from 'vitest';
import { isAdmin, isOpenPath } from './adminGate.ts';

function userinfo(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
}

describe('isOpenPath', () => {
  it('should let the placeholder and the auth routes through', () => {
    for (const path of ['/', '/auth/signin', '/callback', '/logout', '/api/store-token', '/_app/immutable/x.js']) {
      expect(isOpenPath(path)).toBe(true);
    }
  });

  it('should treat a data request as its page', () => {
    expect(isOpenPath('/__data.json')).toBe(true);
    expect(isOpenPath('/callback/__data.json')).toBe(true);
    expect(isOpenPath('/_design/__data.json')).toBe(false);
  });

  it('should gate everything else', () => {
    for (const path of ['/_design', '/shows/the-boys-2019', '/callbackx', '/auth']) {
      expect(isOpenPath(path)).toBe(false);
    }
  });
});

describe('isAdmin', () => {
  it('should be true for the admin claim', async () => {
    const fetch = userinfo({ sub: '1', u: { a: true } });

    expect(await isAdmin({ token: 'abc', fetch })).toBe(true);
    expect(new Headers(fetch.mock.calls.at(0)?.[1]?.headers).get('Authorization')).toBe('Bearer abc');
  });

  it('should be false without a token, without the claim, or on a failed call', async () => {
    expect(await isAdmin({ token: null, fetch: userinfo({ u: { a: true } }) })).toBe(false);
    expect(await isAdmin({ token: 'abc', fetch: userinfo({ u: { a: false } }) })).toBe(false);
    expect(await isAdmin({ token: 'abc', fetch: userinfo({ u: { a: 'true' } }) })).toBe(false);
    expect(await isAdmin({ token: 'abc', fetch: userinfo({ u: { a: true } }, 401) })).toBe(false);
    expect(await isAdmin({ token: 'abc', fetch: vi.fn<typeof fetch>(() => Promise.reject(new TypeError('x'))) }))
      .toBe(false);
  });
});
