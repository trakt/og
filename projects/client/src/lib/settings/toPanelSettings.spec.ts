import { describe, expect, it } from 'vitest';
import { toPanelSettings } from './toPanelSettings.ts';
import { toPanelPatch } from './toPanelPatch.ts';
import { panelAccess } from './panelAccess.ts';

describe('settings panels', () => {
  it('should normalize null preferences, legacy activity sorting and preserve saved booleans', () => {
    const result = toPanelSettings({
      browsing: { progress: { on_deck: { sort: 'activity', refresh: true } }, calendar: { period: null } },
    });
    expect(result.progress.on_deck).toMatchObject({ sort: 'added', refresh: true, simple_progress: false });
    expect(result.calendar.period).toBe('week');
    expect(result.profile.most_watched_movies.sort_by).toBe('time');
  });
  it('should send only changes to their write locations without replacing sibling settings', () => {
    const before = toPanelSettings(null);
    const after = structuredClone(before);
    after.progress.watched.include_collected = true;
    after.calendar.hide_specials = true;
    after.profile.favorites.sort_how = 'desc';
    expect(toPanelPatch({ before, after, vip: true, grandfathered: true })).toEqual({
      browsing: { progress: { watched: { include_collected: true } }, calendar: { hide_specials: true } },
      user: { profile: { favorites: { sort_how: 'desc' } } },
    });
    expect(toPanelPatch({ before, after: before, vip: true, grandfathered: true })).toBeNull();
  });
  it('should protect VIP and grandfathered preferences when saving as a free member', () => {
    const before = toPanelSettings(null);
    const after = structuredClone(before);
    after.progress.on_deck.only_favorites = true;
    after.calendar.autoscroll = true;
    after.calendar.image_type = 'poster';
    after.yir.shows_most_played = 'watched';
    expect(toPanelPatch({ before, after, vip: false, grandfathered: false })).toBeNull();
    expect(toPanelPatch({ before, after, vip: false, grandfathered: true })).toEqual({
      browsing: { calendar: { image_type: 'poster' } },
    });
  });
  it('should retain grandfathered access only for accounts before the cutoff', () => {
    expect(panelAccess({ user: { joined_at: '2024-09-10T12:00:00Z', vip: false } })).toEqual({
      vip: false,
      grandfathered: true,
    });
    expect(panelAccess({ user: { joined_at: '2024-09-11T00:00:00Z', vip: false } }).grandfathered).toBe(false);
    expect(panelAccess({ user: { vip: true } }).grandfathered).toBe(true);
    expect(panelAccess(null)).toEqual({ vip: false, grandfathered: false });
  });
});
