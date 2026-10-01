import { describe, expect, it } from 'vitest';
import { commentDates } from './commentDates.ts';

const UTC = { timeZone: 'UTC' };

describe('util: commentDates', () => {
  it('should show the posted date with its time', () => {
    expect(commentDates({ createdAt: '2026-09-28T12:23:00Z', updatedAt: '2026-09-28T12:23:00Z' }, UTC)).toEqual({
      posted: 'Sep 28, 2026 12:23 PM',
    });
  });

  it('should ignore edits within a day of posting', () => {
    expect(commentDates({ createdAt: '2026-09-28T12:23:00Z', updatedAt: '2026-09-29T12:00:00Z' }, UTC).updated)
      .toBeUndefined();
  });

  it('should show a later edit without the year in the same year, and with it otherwise', () => {
    expect(commentDates({ createdAt: '2026-09-28T12:23:00Z', updatedAt: '2026-09-30T08:00:00Z' }, UTC).updated)
      .toBe('Sep 30');
    expect(commentDates({ createdAt: '2021-11-01T12:15:00Z', updatedAt: '2022-02-14T08:00:00Z' }, UTC).updated)
      .toBe('Feb 14, 2022');
  });

  it("should follow the member's date order and clock", () => {
    expect(
      commentDates({ createdAt: '2026-09-28T13:05:00Z', updatedAt: '2026-09-28T13:05:00Z' }, {
        ...UTC,
        order: 'dmy',
        hour24: true,
      }).posted,
    ).toBe('28 Sep 2026 13:05');
  });
});
