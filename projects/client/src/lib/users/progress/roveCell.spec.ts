import { describe, expect, it } from 'vitest';
import { roveCell } from './roveCell.ts';

const lengths = [10, 4, 0, 6];
const rove = (key: string, row: number, index: number) => roveCell({ key, row, index, lengths });

describe('roveCell', () => {
  it('should move left and right within a row, stopping at its ends', () => {
    expect(rove('ArrowRight', 0, 3)).toEqual({ row: 0, index: 4 });
    expect(rove('ArrowLeft', 0, 3)).toEqual({ row: 0, index: 2 });
    expect(rove('ArrowRight', 0, 9)).toBeUndefined();
    expect(rove('ArrowLeft', 0, 0)).toBeUndefined();
  });

  it("should jump to a row's ends with Home and End", () => {
    expect(rove('Home', 0, 5)).toEqual({ row: 0, index: 0 });
    expect(rove('End', 0, 5)).toEqual({ row: 0, index: 9 });
  });

  it('should move up and down to the same position, or the last cell of a shorter row', () => {
    expect(rove('ArrowDown', 0, 2)).toEqual({ row: 1, index: 2 });
    expect(rove('ArrowDown', 0, 8)).toEqual({ row: 1, index: 3 });
    expect(rove('ArrowUp', 1, 3)).toEqual({ row: 0, index: 3 });
  });

  it('should not move past the first or last row, or into an empty one', () => {
    expect(rove('ArrowUp', 0, 0)).toBeUndefined();
    expect(rove('ArrowDown', 3, 0)).toBeUndefined();
    expect(rove('ArrowDown', 1, 0)).toBeUndefined();
  });

  it('should ignore other keys', () => {
    expect(rove('Enter', 0, 0)).toBeUndefined();
  });
});
