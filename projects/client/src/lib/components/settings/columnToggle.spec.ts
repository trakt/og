import { describe, expect, it } from 'vitest';
import { columnToggle } from './columnToggle.ts';

describe('columnToggle', () => {
  it('should check the column when any checkbox is off', () => {
    expect(columnToggle([true, false, true])).toBe(true);
    expect(columnToggle([false, false])).toBe(true);
  });

  it('should uncheck the column when every checkbox is on', () => {
    expect(columnToggle([true, true])).toBe(false);
  });
});
