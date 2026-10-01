import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { rawApiFetch } from './rawApiFetch.ts';
import { TRAKT_CLIENT_ID } from './traktClientId.ts';

const seen: Request[] = [];
const server = setupServer(
  http.all('https://apiz.trakt.tv/v3/*', ({ request }) => {
    seen.push(request);
    return HttpResponse.json({ ok: true });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

describe('rawApiFetch', () => {
  it('should send the api key, version and Bearer token', async () => {
    const response = await rawApiFetch({ path: '/v3/thing', token: 'abc' });

    expect(await response.json()).toEqual({ ok: true });
    expect(seen.at(0)?.headers.get('trakt-api-key')).toBe(TRAKT_CLIENT_ID);
    expect(seen.at(0)?.headers.get('trakt-api-version')).toBe('2');
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer abc');
  });

  it('should keep the caller init and headers', async () => {
    await rawApiFetch({
      path: '/v3/thing',
      init: { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } },
    });

    expect(seen.at(0)?.method).toBe('POST');
    expect(seen.at(0)?.headers.get('content-type')).toBe('application/json');
    expect(seen.at(0)?.headers.has('authorization')).toBe(false);
  });
});
