import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_COOKIE } from '../../../lib/auth/authCookie.ts';
import { POST } from './+server.ts';

function post(body: string) {
  const cookies = { set: vi.fn(), delete: vi.fn() };
  const request = new Request('http://localhost/api/store-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const response = POST({ request, cookies } as unknown as RequestEvent);
  return { cookies, response };
}

describe('POST /api/store-token', () => {
  it('should set an httpOnly cookie that expires with the token', async () => {
    const expiresAt = Date.now() + 60_000;
    const { cookies, response } = post(JSON.stringify({ token: 'abc', expiresAt }));

    expect((await response).status).toBe(204);
    expect(cookies.set).toHaveBeenCalledWith(AUTH_COOKIE, 'abc', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      expires: new Date(expiresAt),
    });
  });

  it.each([
    ['a logout', JSON.stringify({ token: null, expiresAt: null })],
    ['an expired token', JSON.stringify({ token: 'abc', expiresAt: Date.now() - 1 })],
    ['a token of the wrong type', JSON.stringify({ token: 42, expiresAt: Date.now() + 60_000 })],
    ['a body that is not JSON', 'nope'],
  ])('should clear the cookie for %s', async (_, body) => {
    const { cookies, response } = post(body);

    await response;
    expect(cookies.set).not.toHaveBeenCalled();
    expect(cookies.delete).toHaveBeenCalledWith(AUTH_COOKIE, { path: '/' });
  });
});
