import { describe, expect, it } from 'vitest';
import { nextTab } from './nextTab.ts';

const ids = ['watching', 'watched', 'rated'];

describe('nextTab', () => {
  it('should move right and wrap to the first tab', () => {
    expect(nextTab(ids, 'watching', 'ArrowRight')).toBe('watched');
    expect(nextTab(ids, 'rated', 'ArrowRight')).toBe('watching');
  });

  it('should move left and wrap to the last tab', () => {
    expect(nextTab(ids, 'watched', 'ArrowLeft')).toBe('watching');
    expect(nextTab(ids, 'watching', 'ArrowLeft')).toBe('rated');
  });

  it('should jump to the ends with Home and End', () => {
    expect(nextTab(ids, 'watched', 'Home')).toBe('watching');
    expect(nextTab(ids, 'watched', 'End')).toBe('rated');
  });

  it('should ignore other keys and empty lists', () => {
    expect(nextTab(ids, 'watched', 'Enter')).toBeUndefined();
    expect(nextTab([], undefined, 'ArrowRight')).toBeUndefined();
  });
});
