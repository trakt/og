import { describe, expect, it, vi } from 'vitest';
import { api } from '../api/api.ts';
import { workerUnauthorized } from '../api/workerUnauthorized.ts';
import { authenticatedFetch } from './authenticatedFetch.ts';
import { fakeUser } from './fakeUser.ts';
import { fakeUserManager } from './fakeUserManager.ts';

function bearerOf(call: Parameters<typeof fetch> | undefined) {
  return new Headers(call?.[1]?.headers).get('Authorization');
}

describe('authenticatedFetch', () => {
  it('should send the stored bearer', async () => {
    const { manager } = fakeUserManager({ current: fakeUser('abc', 3600) });
    const baseFetch = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null)));

    await authenticatedFetch({ manager, baseFetch })('https://apiz.trakt.tv/x');

    expect(bearerOf(baseFetch.mock.calls.at(0))).toBe('Bearer abc');
  });

  it('should retry a 401 once with the renewed bearer', async () => {
    const { manager } = fakeUserManager({
      current: fakeUser('spent', 3600),
      signinSilent: () => Promise.resolve(fakeUser('renewed', 3600)),
    });
    const baseFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await authenticatedFetch({ manager, baseFetch })('https://apiz.trakt.tv/x');

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
    expect(bearerOf(baseFetch.mock.calls.at(1))).toBe('Bearer renewed');
  });

  it('should return the 401 when the renewal fails', async () => {
    const { manager } = fakeUserManager({
      current: fakeUser('spent', 3600),
      signinSilent: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    const baseFetch = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 401 })));

    const response = await authenticatedFetch({ manager, baseFetch })('https://apiz.trakt.tv/x');

    expect(response.status).toBe(401);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('should not renew for a request without a bearer', async () => {
    const fake = fakeUserManager({});
    const baseFetch = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 401 })));

    await authenticatedFetch({ manager: fake.manager, baseFetch })('https://apiz.trakt.tv/x');

    expect(bearerOf(baseFetch.mock.calls.at(0))).toBeNull();
    expect(fake.signinSilent).not.toHaveBeenCalled();
  });

  describe("through the typed client, on the worker's plain-text 401", () => {
    it('should renew and retry', async () => {
      const { manager } = fakeUserManager({
        current: fakeUser('spent', 3600),
        signinSilent: () => Promise.resolve(fakeUser('renewed', 3600)),
      });
      const baseFetch = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(workerUnauthorized())
        .mockResolvedValueOnce(Response.json([]));

      const response = await api({ fetch: authenticatedFetch({ manager, baseFetch }) }).sync.progress.upNext.standard({
        query: {},
      });

      expect(response.status).toBe(200);
      expect(bearerOf(baseFetch.mock.calls.at(1))).toBe('Bearer renewed');
    });

    it('should answer the 401 when the renewal fails', async () => {
      const { manager } = fakeUserManager({
        current: fakeUser('spent', 3600),
        signinSilent: () => Promise.reject(new TypeError('Failed to fetch')),
      });
      const baseFetch = vi.fn<typeof fetch>(() => Promise.resolve(workerUnauthorized()));

      const response = await api({ fetch: authenticatedFetch({ manager, baseFetch }) }).sync.progress.upNext.standard({
        query: {},
      });

      expect(response.status).toBe(401);
    });
  });
});
