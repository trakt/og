import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardPrefs } from './dashboardPrefs.ts';

describe('dashboardPrefs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("should fall back to OG's defaults", () => {
    expect(dashboardPrefs.read(undefined, 'sean')).toEqual({
      on_deck_poster: 'show',
      upcoming_filter: 'shows-movies',
      upcoming_start_day: 'today',
      upcoming_poster: 'show',
      hide_on_deck: false,
      hide_upcoming: false,
      hide_list: false,
      hide_suggested_people: false,
      hide_stats: false,
      hide_recently_watched: false,
      hide_network: false,
      hide_recommendations: false,
    });
  });

  it("should read the member's own prefs", () => {
    const cookie = JSON.stringify({
      sean: { upcoming_filter: 'premieres', hide_list: true },
      justin: { hide_stats: true },
    });

    expect(dashboardPrefs.read(cookie, 'sean')).toMatchObject({ upcoming_filter: 'premieres', hide_list: true });
    expect(dashboardPrefs.read(cookie, 'sean').hide_stats).toBe(false);
  });

  it('should ignore unreadable cookies and values', () => {
    expect(dashboardPrefs.read('{nope', 'sean')).toEqual(dashboardPrefs.defaults);
    expect(dashboardPrefs.read('[1]', 'sean')).toEqual(dashboardPrefs.defaults);
    const cookie = JSON.stringify({
      sean: { upcoming_filter: 'everything', hide_list: 'yes', on_deck_poster: 'season' },
    });
    expect(dashboardPrefs.read(cookie, 'sean')).toEqual({ ...dashboardPrefs.defaults, on_deck_poster: 'season' });
  });

  it("should write only the changed fields, keeping other members' prefs", () => {
    const cookie = JSON.stringify({ justin: { hide_stats: true } });
    const next = dashboardPrefs.write(cookie, 'sean', { ...dashboardPrefs.defaults, upcoming_start_day: 'monday' });

    expect(JSON.parse(next)).toEqual({ justin: { hide_stats: true }, sean: { upcoming_start_day: 'monday' } });
  });

  it('should drop a member whose prefs are all back to the defaults', () => {
    const cookie = JSON.stringify({ sean: { hide_list: true } });

    expect(dashboardPrefs.write(cookie, 'sean', dashboardPrefs.defaults)).toBe('{}');
  });

  it('should save to and load from the browser cookie', () => {
    const jar = { cookie: 'other=1' };
    vi.stubGlobal('document', jar);
    vi.stubGlobal('location', { protocol: 'https:' });

    dashboardPrefs.save('sean', { ...dashboardPrefs.defaults, hide_network: true });

    expect(jar.cookie).toBe(
      `og-dashboard=${
        encodeURIComponent('{"sean":{"hide_network":true}}')
      }; path=/; samesite=lax; max-age=34560000; secure`,
    );
    jar.cookie = `other=1; ${jar.cookie.split(';')[0]}`;
    expect(dashboardPrefs.load('sean').hide_network).toBe(true);
  });
});
