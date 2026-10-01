import { describe, expect, it } from 'vitest';
import { birthdayYears } from './birthdayYears.ts';

describe('birthdayYears', () => {
  it('should list 12 to 100 years back, newest first', () => {
    const years = birthdayYears({ year: 2026, saved: '' });
    expect(years.at(0)).toBe('2014');
    expect(years.at(-1)).toBe('1926');
    expect(years).toHaveLength(89);
  });

  it('should keep a saved year outside the range in order', () => {
    expect(birthdayYears({ year: 2026, saved: '1920' }).at(-1)).toBe('1920');
    expect(birthdayYears({ year: 2026, saved: '2020' }).at(0)).toBe('2020');
    expect(birthdayYears({ year: 2026, saved: '1990' })).toHaveLength(89);
  });
});
