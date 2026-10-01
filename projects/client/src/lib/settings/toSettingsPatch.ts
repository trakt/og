import type { SettingsDraft } from './SettingsDraft.ts';

type Section = 'user' | 'account' | 'browsing';
type Value = string | boolean | readonly string[];
type Branch = { readonly [key: string]: Value | Branch };

/** The `PUT /users/settings` body: only what changed, since API leaves a missing (null) key alone. */
export type SettingsBody = Readonly<Partial<Record<Section, Branch>>>;

export type SettingsPatch = {
  readonly body: SettingsBody | null;
  /** The new address for `PUT /users/email`, a separate call made only when it changed. */
  readonly email: string | null;
  /** Problems the form catches before it sends anything. */
  readonly errors: readonly string[];
};

// Each draft field and its API destination. A dotted
// key nests, so `watchnow.country` is `browsing.watchnow.country`.
const FIELDS: ReadonlyArray<readonly [keyof SettingsDraft, Section, string]> = [
  ['private', 'user', 'private'],
  ['username', 'user', 'username'],
  ['name', 'user', 'name'],
  ['location', 'user', 'location'],
  ['about', 'user', 'about'],
  ['displayAge', 'user', 'display_dob'],
  // An API zone name has no slash, so API stores it as sent instead of mapping an IANA zone back.
  ['timeZone', 'account', 'timezone'],
  ['dateFormat', 'account', 'date_format'],
  ['time24hr', 'account', 'time_24hr'],
  ['weekStartDay', 'browsing', 'week_start_day'],
  ['watchPopupAction', 'browsing', 'watch_popup_action'],
  ['hideWatchingNow', 'browsing', 'hide_watching_now'],
  ['releaseDateIgnoreRuntime', 'browsing', 'release_date_ignore_runtime'],
  ['listPopupAction', 'browsing', 'list_popup_action'],
  ['watchAfterRating', 'browsing', 'watch_after_rating'],
  ['hideEpisodeTypeTags', 'browsing', 'hide_episode_type_tags'],
  ['otherSiteRatings', 'browsing', 'other_site_ratings'],
  ['displayEarlyRatings', 'browsing', 'display_early_ratings'],
  ['watchOnlyOnce', 'browsing', 'watch_only_once'],
  ['rewatchingAdjustPercentage', 'browsing', 'rewatching.adjust_percentage'],
  ['watchNowCountry', 'browsing', 'watchnow.country'],
  ['watchNowFavorites', 'browsing', 'watchnow.favorites'],
  // Not watchNowOnlyFavorites: API also calls a that doesn't exist
  // so sending it fails the whole save. The checkbox is read only until that's fixed.
  ['episodeSpoilers', 'browsing', 'spoilers.episodes'],
  ['showSpoilers', 'browsing', 'spoilers.shows'],
  ['movieSpoilers', 'browsing', 'spoilers.movies'],
  ['commentSpoilers', 'browsing', 'spoilers.comments'],
  ['ratingSpoilers', 'browsing', 'spoilers.ratings'],
  ['actorSpoilers', 'browsing', 'spoilers.actors'],
];

const pad = (value: string) => value.padStart(2, '0');

/** `YYYY-MM-DD`, empty for no birthday, or null when only some of the selects are set or the date doesn't exist. */
function dob({ birthYear, birthMonth, birthDay }: SettingsDraft): string | null {
  const parts = [birthYear, birthMonth, birthDay];
  if (parts.every((part) => part === '')) return '';
  if (parts.some((part) => part === '')) return null;

  const date = new Date(Date.UTC(Number(birthYear), Number(birthMonth) - 1, Number(birthDay)));
  if (date.getUTCMonth() !== Number(birthMonth) - 1) return null;
  return `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`;
}

function clean(draft: SettingsDraft): SettingsDraft {
  return { ...draft, username: draft.username.trim(), email: draft.email.trim() };
}

const same = (a: Value, b: Value) =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((item, index) => item === b[index]) : a === b;

const isBranch = (node: Value | Branch | undefined): node is Branch => typeof node === 'object' && !Array.isArray(node);

/** `branch` with `value` set at the dotted `path`. */
function place(branch: Branch | undefined, [key = '', ...rest]: readonly string[], value: Value): Branch {
  const child = branch?.[key];
  return { ...branch, [key]: rest.length ? place(isBranch(child) ? child : undefined, rest, value) : value };
}

function nest(changes: ReadonlyArray<readonly [Section, string, Value]>): SettingsBody | null {
  if (!changes.length) return null;
  return changes.reduce<SettingsBody>(
    (body, [section, key, value]) => ({ ...body, [section]: place(body[section], key.split('.'), value) }),
    {},
  );
}

/** What the General form has to send to turn `before` (the saved settings) into `after` (the form). */
export function toSettingsPatch({ before, after }: { before: SettingsDraft; after: SettingsDraft }): SettingsPatch {
  const [saved, edited] = [clean(before), clean(after)];
  const birthday = dob(edited);
  const errors = birthday === null ? ['Your birthday needs a valid month, day and year.'] : [];

  const changes = FIELDS.filter(([field]) => !same(edited[field], saved[field])).map(
    ([field, section, key]) => [section, key, edited[field]] as const,
  );
  const dobChange = birthday !== null && birthday !== dob(saved) ? [['user', 'dob', birthday] as const] : [];

  return {
    body: nest([...changes, ...dobChange]),
    email: edited.email !== '' && edited.email !== saved.email ? edited.email : null,
    errors,
  };
}
