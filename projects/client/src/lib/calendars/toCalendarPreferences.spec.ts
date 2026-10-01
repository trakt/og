import { describe, expect, it } from 'vitest';
import { toCalendarPreferences } from './toCalendarPreferences.ts';

const settings = (user: unknown, calendar: unknown) => ({ user, browsing: { calendar } });

describe('toCalendarPreferences', () => {
  it('should use defaults for signed-out, missing or invalid settings', () => {
    const defaults = {
      period: 'week',
      layout: 'list',
      startDay: 'today',
      imageType: 'logo',
      autoscroll: false,
      hideSpecials: false,
    };
    expect(toCalendarPreferences(null)).toEqual(defaults);
    expect(toCalendarPreferences({})).toEqual(defaults);
    expect(
      toCalendarPreferences(settings({}, { period: 'year', start_day: 'bogus', layout: 'tiles', image_type: 'x' })),
    ).toEqual(defaults);
  });
  it('should honor every valid setting for VIPs', () => {
    expect(toCalendarPreferences(settings({ vip: true }, {
      period: 'month',
      layout: 'grid',
      start_day: 'monday',
      image_type: 'none',
      autoscroll: true,
      hide_specials: true,
    }))).toEqual({
      period: 'month',
      layout: 'grid',
      startDay: 'monday',
      imageType: 'none',
      autoscroll: true,
      hideSpecials: true,
    });
  });
  it('should preserve image choices only for VIPs or grandfathered accounts', () => {
    const calendar = { image_type: 'poster' };
    expect(toCalendarPreferences(settings({ vip: false, joined_at: '2024-09-10T23:59:59Z' }, calendar)).imageType).toBe(
      'poster',
    );
    expect(toCalendarPreferences(settings({ vip: false, joined_at: '2024-09-11T00:00:00Z' }, calendar)).imageType).toBe(
      'logo',
    );
    expect(toCalendarPreferences(settings({}, calendar)).imageType).toBe('logo');
  });
});
