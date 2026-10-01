import { describe, expect, it } from 'vitest';
import { settingsFixture } from './settingsFixture.ts';
import { toSettingsDraft } from './toSettingsDraft.ts';

const withUser = (user: Record<string, unknown>) => ({
  ...settingsFixture,
  user: { ...settingsFixture.user, ...user },
});

// What OG shows for a preference that was never saved.
const defaults = {
  watchPopupAction: 'ask',
  hideWatchingNow: false,
  releaseDateIgnoreRuntime: false,
  listPopupAction: 'ask',
  watchAfterRating: '',
  hideEpisodeTypeTags: false,
  otherSiteRatings: false,
  displayEarlyRatings: false,
  watchOnlyOnce: false,
  rewatchingAdjustPercentage: false,
  watchNowCountry: 'us',
  watchNowFavorites: [],
  watchNowOnlyFavorites: false,
  episodeSpoilers: 'show',
  showSpoilers: 'show',
  movieSpoilers: 'show',
  commentSpoilers: 'show',
  ratingSpoilers: 'show',
  actorSpoilers: 'show',
};

describe('toSettingsDraft', () => {
  it("should read every panel's fields", () => {
    expect(toSettingsDraft(settingsFixture)).toEqual({
      private: false,
      username: 'og_tester',
      email: 'og_tester@example.com',
      name: 'OG Tester',
      location: 'Springfield',
      about: 'Watching everything, one episode at a time.',
      birthMonth: '4',
      birthDay: '7',
      birthYear: '1990',
      displayAge: true,
      timeZone: 'Pacific Time (US & Canada)',
      dateFormat: 'mdy',
      time24hr: false,
      weekStartDay: '1',
      watchPopupAction: 'now',
      hideWatchingNow: false,
      releaseDateIgnoreRuntime: false,
      listPopupAction: 'ask',
      watchAfterRating: 'released',
      hideEpisodeTypeTags: true,
      otherSiteRatings: true,
      displayEarlyRatings: false,
      watchOnlyOnce: false,
      rewatchingAdjustPercentage: true,
      watchNowCountry: 'us',
      watchNowFavorites: ['us-netflix', 'us-hbo_max', 'gb-bbc_iplayer', 'us-hulu'],
      watchNowOnlyFavorites: true,
      episodeSpoilers: 'hide',
      showSpoilers: 'hide',
      movieSpoilers: 'show',
      commentSpoilers: 'show',
      ratingSpoilers: 'hide',
      actorSpoilers: 'show',
    });
  });

  it('should leave out what API left out', () => {
    expect(
      toSettingsDraft({
        user: { username: 'quiet', private: true, name: null, age: null, dob: null },
        account: null,
        browsing: { week_start_day: null },
      }),
    ).toEqual({
      private: true,
      username: 'quiet',
      email: '',
      name: '',
      location: '',
      about: '',
      birthMonth: '',
      birthDay: '',
      birthYear: '',
      displayAge: false,
      timeZone: 'London',
      dateFormat: 'mdy',
      time24hr: false,
      weekStartDay: '0',
      ...defaults,
    });
  });

  it("should fall back to OG's default for a preference it doesn't know", () => {
    const draft = toSettingsDraft({
      ...settingsFixture,
      browsing: {
        watch_popup_action: 'teleport',
        watch_after_rating: null,
        hide_watching_now: 'yes',
        watchnow: { country: 'GB', favorites: 'netflix' },
        spoilers: { episodes: 'hide_screenshots', shows: 'maybe' },
      },
    });
    expect(draft).toMatchObject({
      watchPopupAction: 'ask',
      watchAfterRating: '',
      hideWatchingNow: false,
      watchNowCountry: 'gb',
      watchNowFavorites: [],
      episodeSpoilers: 'hide_screenshots',
      showSpoilers: 'show',
    });
  });

  it('should keep the Account fields when the preferences are malformed', () => {
    expect(toSettingsDraft({ ...settingsFixture, browsing: { week_start_day: '3', spoilers: 'all' } })).toMatchObject({
      username: 'og_tester',
      weekStartDay: '3',
      episodeSpoilers: 'show',
    });
  });

  it('should infer Display Age from the age API only sends when it is shown', () => {
    expect(toSettingsDraft(withUser({ age: undefined }))?.displayAge).toBe(false);
    expect(toSettingsDraft(withUser({ age: 0 }))?.displayAge).toBe(true);
  });

  it('should pick the API zone that API maps a shared IANA zone back to', () => {
    const zone = (timezone: string) => toSettingsDraft({ ...settingsFixture, account: { timezone } })?.timeZone;
    expect(zone('Europe/London')).toBe('London');
    expect(zone('America/New_York')).toBe('Eastern Time (US & Canada)');
    expect(zone('Antarctica/Troll')).toBe('Antarctica/Troll');
  });

  it('should be null for a response it cannot read', () => {
    expect(toSettingsDraft(null)).toBeNull();
    expect(toSettingsDraft({ user: {} })).toBeNull();
  });
});
