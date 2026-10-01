import { describe, expect, it } from 'vitest';
import { wordCount } from './wordCount.ts';

describe('wordCount', () => {
  it('should count runs of letters and numbers, not spaces', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
    expect(wordCount('Too  short')).toBe(2);
    expect(wordCount("Don't -- stop, 2 believin'!")).toBe(5);
    expect(wordCount('line one\nline two')).toBe(4);
  });

  it('should count each CJK character as a word', () => {
    expect(wordCount('素晴らしい映画')).toBe(7);
    expect(wordCount('great 영화')).toBe(3);
  });
});
