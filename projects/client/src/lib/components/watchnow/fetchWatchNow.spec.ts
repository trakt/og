import { describe, expect, it } from 'vitest';
import { fetchWatchNow } from './fetchWatchNow.ts';
import { watchNowOrderSchema } from './watchNowSchema.ts';

const respond = (body: string, status = 200) => (() => Promise.resolve(new Response(body, { status }))) as typeof fetch;

const read = (fetch: typeof globalThis.fetch) =>
  fetchWatchNow({ fetch, path: '/movies/x/watchnow/favorites/us', schema: watchNowOrderSchema });

describe('fetchWatchNow', () => {
  it('should return the parsed body', async () => {
    expect(await read(respond('["us-netflix"]'))).toEqual(['us-netflix']);
  });

  it('should return null for an error status', async () => {
    expect(await read(respond('["us-netflix"]', 404))).toBeNull();
  });

  it('should return null for a body that isn’t JSON', async () => {
    expect(await read(respond('<html>'))).toBeNull();
  });

  it('should return null for a body the schema rejects', async () => {
    expect(await read(respond('{"us":[]}'))).toBeNull();
  });

  it('should return null when the request fails', async () => {
    expect(await read((() => Promise.reject(new TypeError('offline'))) as typeof fetch)).toBeNull();
  });
});
