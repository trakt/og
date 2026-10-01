import { describe, expect, it } from 'vitest';
import { moveListItem } from './moveListItem.ts';

describe('moveListItem', () => {
  const order = [10, 20, 30, 40];

  it('should move an item to a position in the whole order', () => {
    expect(moveListItem(order, 40, 1)).toEqual([40, 10, 20, 30]);
    expect(moveListItem(order, 10, 3)).toEqual([20, 30, 10, 40]);
  });

  it('should clamp a position past either end', () => {
    expect(moveListItem(order, 20, 99)).toEqual([10, 30, 40, 20]);
    expect(moveListItem(order, 30, 0)).toEqual([30, 10, 20, 40]);
  });

  it('should keep the same order for no move, an unknown item or a bad position', () => {
    expect(moveListItem(order, 20, 2)).toBe(order);
    expect(moveListItem(order, 99, 1)).toBe(order);
    expect(moveListItem(order, 20, Number.NaN)).toBe(order);
  });
});
