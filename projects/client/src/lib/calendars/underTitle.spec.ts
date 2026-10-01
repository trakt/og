import { describe, expect, it } from 'vitest';
import { MY_CALENDARS } from './myCalendars.ts';
import { PUBLIC_CALENDARS } from './publicCalendars.ts';
import { underTitle } from './underTitle.ts';

const [shows, , newShows, , , streaming] = PUBLIC_CALENDARS;
const window = { start: '2026-09-29', end: '2026-10-06' };

describe('underTitle', () => {
  it("should read like OG's", () => {
    expect(underTitle({ calendar: shows, count: 1234, window, today: '2026-09-29' })).toEqual({
      count: '1,234',
      rest: 'episodes airing between September 29, 2026 and October 6, 2026.',
      sentence: '1,234 episodes airing between September 29, 2026 and October 6, 2026.',
    });
  });

  it('should drop the plural s for one item', () => {
    expect(underTitle({ calendar: newShows, count: 1, window, today: '2026-09-29' }).rest).toMatch(/^new show /);
  });

  it('should use the past tense once the window has ended', () => {
    expect(underTitle({ calendar: shows, count: 2, window, today: '2026-10-07' }).rest).toMatch(/^episodes aired /);
    expect(underTitle({ calendar: streaming, count: 2, window, today: '2026-09-29' }).rest).toMatch(
      /^movies started streaming /,
    );
  });

  it('should count items on My Shows & Movies', () => {
    const [showsMovies] = MY_CALENDARS;
    expect(underTitle({ calendar: showsMovies, count: 1, window, today: '2026-09-29' }).rest).toMatch(/^item airing /);
  });
});

it('should describe monthly results without naming filler days', () => {
  expect(
    underTitle({
      calendar: { itemType: 'episodes', past: 'aired', present: 'airing' },
      count: 2,
      window: { start: '2026-09-01', end: '2026-09-30', period: 'month' },
      today: '2026-09-29',
    }).rest,
  )
    .toBe('episodes airing in September 2026.');
});

it('should honor the account date order without shifting calendar days', () => {
  expect(
    underTitle({
      calendar: { itemType: 'episodes', past: 'aired', present: 'airing' },
      count: 2,
      window: { start: '2026-09-29', end: '2026-10-06' },
      today: '2026-09-29',
      datePreferences: { order: 'dmy' },
    }).rest,
  )
    .toBe('episodes airing between 29 September 2026 and 6 October 2026.');
});
