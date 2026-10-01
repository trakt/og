import { describe, expect, it } from 'vitest';
import { toMovieReleases } from './toMovieReleases.ts';

const datePreferences = { order: 'dmy', timeZone: 'America/Los_Angeles', hour24: false, weekStartDay: 1 } as const;
const row = (country: string, release_date: string, release_type = 'theatrical') => ({
  country,
  release_date,
  release_type,
});

describe('toMovieReleases', () => {
  it('should group and sort countries by name, then dates chronologically without mutating the input', () => {
    const releases = Object.freeze([row('us', '1999-11-01'), row('gb', '1999-11-06'), row('US', '1999-10-15')]);
    const result = toMovieReleases({ releases, originalCountry: 'US', datePreferences });
    expect(result.map(({ name, original }) => [name, original])).toEqual([
      ['United Kingdom', false],
      ['United States', true],
    ]);
    expect(result.at(1)?.rows.map(({ dateText }) => dateText)).toEqual(['15 Oct 1999', '1 Nov 1999']);
    expect(releases.at(0)?.release_date).toBe('1999-11-01');
  });

  it('should preserve calendar dates west of UTC and distinguish every release type', () => {
    const releases = ['premiere', 'limited', 'theatrical', 'digital', 'physical', 'tv', 'unknown'].map((type) =>
      row('us', '1999-10-15T00:00:00.000Z', type)
    );
    const rows = toMovieReleases({ releases, originalCountry: 'gb', datePreferences }).at(0)?.rows;
    expect(rows?.map(({ type, qualifier }) => [type, qualifier])).toEqual([
      ['Premiere', ''],
      ['Theatrical', '(limited)'],
      ['Theatrical', ''],
      ['Digital', ''],
      ['Physical', ''],
      ['TV', ''],
      ['Unknown', ''],
    ]);
    expect(
      rows?.every(({ dateText, certification, note }) =>
        dateText === '15 Oct 1999' && certification === '' && note === ''
      ),
    ).toBe(true);
  });

  it('should preserve notes and certifications as text, and return no panels for an empty list', () => {
    const result = toMovieReleases({
      releases: [{ ...row('gb', '1999-11-06'), certification: 'R', note: '<b>Festival</b>' }],
      datePreferences,
    });
    expect(result.at(0)?.rows.at(0)?.note).toBe('<b>Festival</b>');
    expect(result.at(0)?.rows.at(0)?.certification).toBe('R');
    expect(toMovieReleases({ releases: [], datePreferences })).toEqual([]);
  });
});
