import { describe, expect, it } from 'vitest';
import type { CalendarItem } from './calendarDays.ts';
import { viewerAirTime } from './viewerAirTime.ts';

// 9:00 pm Eastern (EDT) on Tuesday, September 29, 2026.
const PRIME_TIME = '2026-09-30T01:00:00.000Z';

const episode = (country: string | null, at = PRIME_TIME) =>
  ({
    type: 'episode',
    at,
    show: { title: 'Shogun', country, ids: { trakt: 1 } },
    episode: { season: 1, number: 1, ids: { trakt: 9 } },
  }) as CalendarItem;

const at = (item: CalendarItem) => item.at;

describe('viewerAirTime', () => {
  it('should keep the Eastern hour on a Pacific clock for a US show', () => {
    // 9:00 pm PDT.
    expect(at(viewerAirTime(episode('us'), 'America/Los_Angeles'))).toBe('2026-09-30T04:00:00.000Z');
    expect(at(viewerAirTime(episode('ca'), 'Pacific/Honolulu'))).toBe('2026-09-30T07:00:00.000Z');
  });

  it('should move a US show an hour earlier on a Central or Mountain clock', () => {
    // 8:00 pm CDT and MDT.
    expect(at(viewerAirTime(episode('us'), 'America/Chicago'))).toBe('2026-09-30T01:00:00.000Z');
    expect(at(viewerAirTime(episode('us'), 'America/Denver'))).toBe('2026-09-30T02:00:00.000Z');
  });

  it('should leave the Eastern zone as it is', () => {
    expect(at(viewerAirTime(episode('us'), 'America/New_York'))).toBe(PRIME_TIME);
  });

  it("should use each date's own offset across a DST change", () => {
    // 9:00 pm EST on Monday, November 2, 2026, after the clocks went back; 9:00 pm PST.
    expect(at(viewerAirTime(episode('us', '2026-11-03T02:00:00.000Z'), 'America/Los_Angeles'))).toBe(
      '2026-11-03T05:00:00.000Z',
    );
  });

  it('should leave other shows, zones and movies alone', () => {
    expect(at(viewerAirTime(episode('gb'), 'America/Los_Angeles'))).toBe(PRIME_TIME);
    expect(at(viewerAirTime(episode(null), 'America/Los_Angeles'))).toBe(PRIME_TIME);
    expect(at(viewerAirTime(episode('us'), 'Europe/London'))).toBe(PRIME_TIME);
    expect(at(viewerAirTime(episode('us'), 'UTC'))).toBe(PRIME_TIME);

    const movie = { type: 'movie', at: '2026-09-30', movie: { ids: { trakt: 5 } } } as CalendarItem;
    expect(viewerAirTime(movie, 'America/Los_Angeles')).toBe(movie);
  });
});
