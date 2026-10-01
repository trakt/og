import { describe, expect, it } from 'vitest';
import { plainTextErrorFetch } from './plainTextErrorFetch.ts';

const JSON_TYPE = 'application/json; charset=utf-8';
const answer = (response: Response) => plainTextErrorFetch(() => Promise.resolve(response))('https://apiz.trakt.tv/x');

describe('plainTextErrorFetch', () => {
  it("should relabel the worker's plain-text error body as text, keeping the status and headers", async () => {
    const response = await answer(
      new Response('List is private or does not exist', {
        status: 403,
        headers: { 'content-type': JSON_TYPE, 'x-request-id': 'r1' },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('x-request-id')).toBe('r1');
    expect(await response.text()).toBe('List is private or does not exist');
  });

  it('should pass JSON error bodies, empty bodies and successes through', async () => {
    const error = new Response('{"error":"invalid_sort"}', { status: 400, headers: { 'content-type': JSON_TYPE } });
    const empty = new Response(null, { status: 404, headers: { 'content-type': JSON_TYPE } });
    const ok = new Response('not json', { status: 200, headers: { 'content-type': JSON_TYPE } });
    expect(await answer(error)).toBe(error);
    expect(await answer(empty)).toBe(empty);
    expect(await answer(ok)).toBe(ok);
  });
});
