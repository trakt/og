import { z } from 'zod/v4';
import { settingOptions } from './settingOptions.ts';
import { railsTimeZones } from './railsTimeZones.ts';
import type { SettingsDraft } from './SettingsDraft.ts';

// `/users/settings` comes from the API, so the fields the form reads are parsed here.
const schema = z.object({
  user: z.object({
    username: z.string(),
    private: z.boolean().nullish(),
    name: z.string().nullish(),
    location: z.string().nullish(),
    about: z.string().nullish(),
    age: z.number().nullish(),
    dob: z.string().nullish(),
    email: z.string().nullish(),
  }),
  account: z.object({
    timezone: z.string().nullish(),
    date_format: z.string().nullish(),
    time_24hr: z.boolean().nullish(),
  }).nullish(),
  browsing: z.object({ week_start_day: z.string().nullish() }).nullish(),
});

// One odd preference falls back to OG's default instead of costing the whole form.
const text = z.string().nullish().catch(null);
const flag = z.boolean().nullish().catch(null);

const preferencesSchema = z.object({
  browsing: z.object({
    watch_popup_action: text,
    hide_watching_now: flag,
    release_date_ignore_runtime: flag,
    list_popup_action: text,
    watch_after_rating: text,
    hide_episode_type_tags: flag,
    other_site_ratings: flag,
    display_early_ratings: flag,
    watch_only_once: flag,
    rewatching: z.object({ adjust_percentage: flag }).nullish().catch(null),
    watchnow: z.object({
      country: text,
      favorites: z.array(z.string()).nullish().catch(null),
      only_favorites: flag,
    }).nullish().catch(null),
    spoilers: z.object({
      episodes: text,
      shows: text,
      movies: text,
      comments: text,
      ratings: text,
      actors: text,
    }).nullish().catch(null),
  }).nullish().catch(null),
});

type Choice =
  | 'watchPopupAction'
  | 'listPopupAction'
  | 'watchAfterRating'
  | 'episodeSpoilers'
  | 'showSpoilers'
  | 'movieSpoilers'
  | 'commentSpoilers'
  | 'ratingSpoilers'
  | 'actorSpoilers';

/** The saved value when the select has it, else OG's default (the first option). */
function choice(options: Choice, value: string | null | undefined): string {
  const values: readonly string[] = settingOptions[options].map(([option]) => option);
  return values.includes(value ?? '') ? value ?? '' : values.at(0) ?? '';
}

/** The Global, Rewatching, Watch Now and Spoilers panels' fields. */
function preferences(settings: unknown) {
  const parsed = preferencesSchema.safeParse(settings);
  const browsing = parsed.success ? parsed.data.browsing : null;
  const { rewatching, watchnow, spoilers } = browsing ?? {};

  return {
    watchPopupAction: choice('watchPopupAction', browsing?.watch_popup_action),
    hideWatchingNow: browsing?.hide_watching_now === true,
    releaseDateIgnoreRuntime: browsing?.release_date_ignore_runtime === true,
    listPopupAction: choice('listPopupAction', browsing?.list_popup_action),
    watchAfterRating: choice('watchAfterRating', browsing?.watch_after_rating),
    hideEpisodeTypeTags: browsing?.hide_episode_type_tags === true,
    otherSiteRatings: browsing?.other_site_ratings === true,
    displayEarlyRatings: browsing?.display_early_ratings === true,
    watchOnlyOnce: browsing?.watch_only_once === true,
    rewatchingAdjustPercentage: rewatching?.adjust_percentage === true,
    // og's other Watch Now reads fall back to the US too (loadListFilterSources).
    watchNowCountry: watchnow?.country?.toLowerCase() || 'us',
    watchNowFavorites: watchnow?.favorites ?? [],
    watchNowOnlyFavorites: watchnow?.only_favorites === true,
    episodeSpoilers: choice('episodeSpoilers', spoilers?.episodes),
    showSpoilers: choice('showSpoilers', spoilers?.shows),
    movieSpoilers: choice('movieSpoilers', spoilers?.movies),
    commentSpoilers: choice('commentSpoilers', spoilers?.comments),
    ratingSpoilers: choice('ratingSpoilers', spoilers?.ratings),
    actorSpoilers: choice('actorSpoilers', spoilers?.actors),
  };
}

/**
 * The API returns an IANA zone, and several API zones share one (Edinburgh and London are both Europe/London).
 * Several display names map to the same IANA zone; the API returns the last matching name, so the form does too.
 */
function railsZone(iana: string | null | undefined): string {
  if (!iana) return 'London';
  return railsTimeZones.findLast((zone) => zone.iana === iana)?.name ?? iana;
}

function birthday(dob: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? '');
  if (!match) return { birthYear: '', birthMonth: '', birthDay: '' };
  const [, year = '', month = '', day = ''] = match;
  return { birthYear: year, birthMonth: String(Number(month)), birthDay: String(Number(day)) };
}

/** The General form's starting values from the layout's `/users/settings`. Null for an unexpected shape. */
export function toSettingsDraft(settings: unknown): SettingsDraft | null {
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return null;
  const { user, account, browsing } = parsed.data;

  return {
    private: user.private === true,
    username: user.username,
    email: user.email ?? '',
    name: user.name ?? '',
    location: user.location ?? '',
    about: user.about ?? '',
    ...birthday(user.dob),
    // No field says whether the age is shown: API only sends `age` when it is.
    displayAge: user.age !== null && user.age !== undefined,
    timeZone: railsZone(account?.timezone),
    dateFormat: account?.date_format || 'mdy',
    time24hr: account?.time_24hr === true,
    weekStartDay: /^[0-6]$/.test(browsing?.week_start_day ?? '') ? browsing?.week_start_day ?? '0' : '0',
    ...preferences(settings),
  };
}
