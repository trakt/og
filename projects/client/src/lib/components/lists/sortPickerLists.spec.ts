import { describe, expect, it } from 'vitest';
import { sortPickerLists } from './sortPickerLists.ts';
const list = (name: string, rank = 0, selected = false) => ({
  id: 1,
  name,
  rank,
  selected,
  count: 0,
  privacy: 'private',
  owner: 'me',
  collaboration: false,
});
describe('sortPickerLists', () => {
  it('should keep selected rows first and ignore title articles', () => {
    expect(sortPickerLists([list('The Zebra'), list('An Apple'), list('The Selected', 0, true)]).map((l) => l.name))
      .toEqual(['The Selected', 'An Apple', 'The Zebra']);
  });
  it('should use user rank when both rows have one', () => {
    expect(sortPickerLists([list('Apple', 3), list('Zebra', 1)]).map((l) => l.name)).toEqual(['Zebra', 'Apple']);
  });
  it('should filter literally and case insensitively without interpreting regex syntax', () => {
    expect(sortPickerLists([list('A [Film]'), list('Movie')], '[').map((l) => l.name)).toEqual(['A [Film]']);
    expect(sortPickerLists([list('Movie')], 'MOV').length).toBe(1);
  });
});
