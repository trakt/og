import { describe, expect, it } from 'vitest';
import { mergeFilterOptions } from './mergeFilterOptions.ts';

describe('mergeFilterOptions', () => {
  it('should merge show and movie choices without duplicates and sort by label', () => {
    expect(mergeFilterOptions([
      [{ value: 'drama', label: 'Drama' }, { value: 'tv-ma', label: 'TV-MA' }],
      [{ value: 'drama', label: 'Drama (Movie)' }, { value: 'action', label: 'Action' }],
    ])).toEqual([
      { value: 'action', label: 'Action' },
      { value: 'drama', label: 'Drama (Movie)' },
      { value: 'tv-ma', label: 'TV-MA' },
    ]);
  });
  it('should preserve the API order on a single-type calendar', () => {
    const options = [{ value: 'b', label: 'B' }, { value: 'a', label: 'A' }];
    expect(mergeFilterOptions([options])).toEqual(options);
  });
});
