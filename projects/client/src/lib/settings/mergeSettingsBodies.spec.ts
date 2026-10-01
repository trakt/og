import { describe, expect, it } from 'vitest';
import { mergeSettingsBodies } from './mergeSettingsBodies.ts';

describe('mergeSettingsBodies', () => {
  it('should preserve account edits alongside profile and browsing preferences', () => {
    expect(mergeSettingsBodies(
      { user: { username: 'new-name' }, account: { time_24hr: true }, browsing: { week_start_day: '1' } },
      {
        user: { profile: { favorites: { sort_by: 'title' } } },
        browsing: { progress: { watched: { refresh: true } } },
      },
    )).toEqual({
      user: { username: 'new-name', profile: { favorites: { sort_by: 'title' } } },
      account: { time_24hr: true },
      browsing: { week_start_day: '1', progress: { watched: { refresh: true } } },
    });
  });
  it('should omit unchanged sections and make no request for an unchanged form', () => {
    expect(mergeSettingsBodies(null, null)).toBeNull();
    expect(mergeSettingsBodies(null, { browsing: { calendar: { hide_specials: true } } })).toEqual({
      browsing: { calendar: { hide_specials: true } },
    });
  });
});
