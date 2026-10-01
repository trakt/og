import { describe, expect, it } from 'vitest';
import { fetchListSummary } from './fetchListSummary.ts';

describe('fetchListSummary', () => {
  it('should pass the response through', async () => {
    expect(await fetchListSummary(() => Promise.resolve({ status: 200 }))).toEqual({ status: 200 });
  });

  it("should read the worker's empty 204 as no list", async () => {
    expect(await fetchListSummary(() => Promise.reject(new SyntaxError('Unexpected end of JSON input')))).toBeNull();
  });

  it('should rethrow anything else', async () => {
    await expect(fetchListSummary(() => Promise.reject(new TypeError('offline')))).rejects.toThrow('offline');
  });
});
