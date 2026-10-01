import { describe, expect, it } from 'vitest';
import { settingsFixture } from './settingsFixture.ts';
import type { SettingsDraft } from './SettingsDraft.ts';
import { toSettingsDraft } from './toSettingsDraft.ts';
import { toSettingsPatch } from './toSettingsPatch.ts';

const before = toSettingsDraft(settingsFixture) as SettingsDraft;
const patch = (changes: Partial<SettingsDraft>) => toSettingsPatch({ before, after: { ...before, ...changes } });

describe('toSettingsPatch', () => {
  it('should send nothing when nothing changed', () => {
    expect(patch({})).toEqual({ body: null, email: null, errors: [] });
  });

  it('should send only the changed fields, nested where settings_update reads them', () => {
    expect(
      patch({
        private: true,
        username: ' renamed ',
        about: '',
        displayAge: false,
        timeZone: 'London',
        time24hr: true,
        weekStartDay: '0',
      }).body,
    ).toEqual({
      user: { private: true, username: 'renamed', about: '', display_dob: false },
      account: { timezone: 'London', time_24hr: true },
      browsing: { week_start_day: '0' },
    });
  });

  it('should send the email by itself, only when it changed to a value', () => {
    expect(patch({ email: 'next@example.com ' })).toEqual({ body: null, email: 'next@example.com', errors: [] });
    expect(patch({ email: ' og_tester@example.com' }).email).toBeNull();
    expect(patch({ email: '' }).email).toBeNull();
  });

  it('should join the birthday selects into one date, or clear it', () => {
    expect(patch({ birthMonth: '12', birthDay: '1' }).body).toEqual({ user: { dob: '1990-12-01' } });
    expect(patch({ birthMonth: '', birthDay: '', birthYear: '' }).body).toEqual({ user: { dob: '' } });
  });

  it('should refuse a birthday that is partly blank or does not exist', () => {
    const message = ['Your birthday needs a valid month, day and year.'];
    expect(patch({ birthYear: '' })).toMatchObject({ body: null, errors: message });
    expect(patch({ birthMonth: '2', birthDay: '30' })).toMatchObject({ body: null, errors: message });
  });

  it('should nest the preference panels where settings_update reads them', () => {
    expect(
      patch({
        watchPopupAction: 'ask',
        hideWatchingNow: true,
        releaseDateIgnoreRuntime: true,
        watchAfterRating: '',
        watchOnlyOnce: true,
        rewatchingAdjustPercentage: false,
        watchNowCountry: 'gb',
        episodeSpoilers: 'hide_overviews',
        actorSpoilers: 'hide',
      }).body,
    ).toEqual({
      browsing: {
        watch_popup_action: 'ask',
        hide_watching_now: true,
        release_date_ignore_runtime: true,
        watch_after_rating: '',
        watch_only_once: true,
        rewatching: { adjust_percentage: false },
        watchnow: { country: 'gb' },
        spoilers: { episodes: 'hide_overviews', actors: 'hide' },
      },
    });
  });

  it('should send the whole favorites list when it changed, and nothing when only its copy did', () => {
    expect(patch({ watchNowFavorites: [...before.watchNowFavorites] }).body).toBeNull();
    expect(patch({ watchNowFavorites: ['us-netflix'] }).body).toEqual({
      browsing: { watchnow: { favorites: ['us-netflix'] } },
    });
  });

  it('should never send Only Favorites, which fails the whole save in API', () => {
    expect(patch({ watchNowOnlyFavorites: !before.watchNowOnlyFavorites }).body).toBeNull();
  });
});
