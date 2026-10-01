import { describe, expect, it } from 'vitest';
import { rowCount } from './rowCount.ts';

describe('rowCount', () => {
  it('should default to one row', () => {
    expect(rowCount({ items: 18 })).toEqual({ rows: 1, maxRows: 3 });
    expect(rowCount({ rows: null, items: 18 })).toEqual({ rows: 1, maxRows: 3 });
  });

  it('should keep the saved rows within what the items fill', () => {
    expect(rowCount({ rows: 3, items: 18 })).toEqual({ rows: 3, maxRows: 3 });
    expect(rowCount({ rows: 3, items: 8 })).toEqual({ rows: 2, maxRows: 2 });
    expect(rowCount({ rows: 0, items: 18 })).toEqual({ rows: 1, maxRows: 3 });
  });

  it('should stop at the maximum', () => {
    expect(rowCount({ rows: 5, items: 40 })).toEqual({ rows: 3, maxRows: 3 });
  });

  it('should have one row for few or no items', () => {
    expect(rowCount({ rows: 2, items: 4 })).toEqual({ rows: 1, maxRows: 1 });
    expect(rowCount({ rows: 2, items: 0 })).toEqual({ rows: 1, maxRows: 1 });
  });

  it('should ignore a corrupt saved value', () => {
    expect(rowCount({ rows: Number.NaN, items: 18 })).toEqual({ rows: 1, maxRows: 3 });
    expect(rowCount({ rows: 1.5, items: 18 })).toEqual({ rows: 1, maxRows: 3 });
  });
});
