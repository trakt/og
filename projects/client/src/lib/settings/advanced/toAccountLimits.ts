import { z } from 'zod/v4';
import type { DatePreferences } from '../DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';

/** One row of the limits table: the Free Plan, the viewer's own (or a VIP's earned) and the VIP limits. */
export type AccountLimitRow = {
  readonly feature: string;
  readonly helper: string;
  readonly free: number;
  readonly yours: number;
  readonly vip: number;
  /** The 🥳 after a non-VIP's lists, once a Traktiversary has earned one. */
  readonly earned: boolean;
};

export type AccountLimits = {
  readonly vip: boolean;
  /** "Today is your 3rd Traktiversary!" instead of the date. */
  readonly traktiversary: string | null;
  /** The signup day in the viewer's zone, "February 12". */
  readonly date: string;
  /** "14.63", only past two full years, as OG thanked. */
  readonly years: string | null;
  /** Lists a non-VIP has earned: one a year, `null` in the first year. */
  readonly earnedLists: number | null;
  readonly maxedOut: boolean;
  readonly rows: readonly AccountLimitRow[];
};

type ToAccountLimitsParams = {
  settings: unknown;
  now: Date;
  datePreferences: DatePreferences;
};

// Displayed account limits. The API has no Free or VIP column.
const HISTORY = 100_000;
const RATINGS = 50_000;
const FAVORITES = 100;
const LISTS = { free: 5, vip: 100 };
const LIST_ITEMS = { free: 1_000, vip: 1_000 };
const WATCHLIST = { free: 1_000, vip: 5_000 };
const LIBRARY = { free: 1_000, vip: 100_000 };
const NOTES = { free: 100, vip: 1_000 };
const SAVED_FILTERS = { free: 5, vip: 100 };
const MAX_EARNED_LISTS = 8;
// ActiveSupport's 1.year, which `years_since_signup` divides by.
const YEAR_MS = 31_556_952_000;

const count = z.number().int().nullish().catch(null);
const schema = z.object({
  user: z.object({ vip: z.boolean().nullish(), joined_at: z.iso.datetime({ offset: true }) }),
  limits: z.object({
    list: z.object({ count, item_count: count }).nullish().catch(null),
    watchlist: z.object({ item_count: count }).nullish().catch(null),
    favorites: z.object({ item_count: count }).nullish().catch(null),
    collection: z.object({ item_count: count }).nullish().catch(null),
    notes: z.object({ item_count: count }).nullish().catch(null),
    saved_filters: z.object({ count }).nullish().catch(null),
  }).nullish().catch(null),
});

/** API's ordinal numbers: 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st. */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/**
 * The Account Limits panel from the layout's `/users/settings`: the Traktiversary notice and the limits table.
 * The viewer's own column reads the API's `limits`, falling back to OG's constants; the others are OG's constants,
 * with a year's extra list per Traktiversary, at most eight. `null` when the settings don't say when the viewer
 * joined.
 */
export function toAccountLimits({ settings, now, datePreferences }: ToAccountLimitsParams): AccountLimits | null {
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return null;

  const { user, limits } = parsed.data;
  const vip = user.vip === true;
  const joined = new Date(user.joined_at);
  const exactYears = (now.getTime() - joined.getTime()) / YEAR_MS;
  const years = Math.max(0, Math.floor(exactYears));
  const today = now.getUTCMonth() === joined.getUTCMonth() && now.getUTCDate() === joined.getUTCDate() && years > 0;
  const lists = LISTS.free + Math.min(years, MAX_EARNED_LISTS);
  // The API's limits are the viewer's current ones: a non-VIP's own column, or a VIP's VIP column.
  const yours = (api: number | null | undefined, free: number) => vip ? free : api ?? free;
  const vipLimit = (api: number | null | undefined, max: number) => vip ? api ?? max : max;
  const listsMax = yours(limits?.list?.count, lists);

  const row = (feature: string, helper: string, [free, mine, max]: readonly [number, number, number]) => ({
    feature,
    helper,
    free,
    yours: mine,
    vip: max,
    earned: false,
  });

  return {
    vip,
    traktiversary: today ? `Today is your ${ordinal(years)} Traktiversary! 🎉` : null,
    date: formatDate(joined, { ...datePreferences, format: 'L' }),
    years: years > 1 ? exactYears.toFixed(2) : null,
    earnedLists: years < 1 ? null : listsMax - LISTS.free,
    maxedOut: years >= MAX_EARNED_LISTS,
    rows: [
      row('Watched History', 'episodes + movies', [HISTORY, HISTORY, HISTORY]),
      row('Ratings', 'shows + seasons + episodes + movies', [RATINGS, RATINGS, RATINGS]),
      row('Favorites', 'shows + movies', [
        FAVORITES,
        yours(limits?.favorites?.item_count, FAVORITES),
        vipLimit(limits?.favorites?.item_count, FAVORITES),
      ]),
      row('Watchlist Items', 'shows + seasons + episodes + movies', [
        WATCHLIST.free,
        yours(limits?.watchlist?.item_count, WATCHLIST.free),
        vipLimit(limits?.watchlist?.item_count, WATCHLIST.vip),
      ]),
      {
        ...row('Lists', 'personal', [LISTS.free, listsMax, vipLimit(limits?.list?.count, LISTS.vip)]),
        earned: !vip && listsMax > LISTS.free,
      },
      row('List Items', 'shows + seasons + episodes + movies + people', [
        LIST_ITEMS.free,
        yours(limits?.list?.item_count, LIST_ITEMS.free),
        vipLimit(limits?.list?.item_count, LIST_ITEMS.vip),
      ]),
      row('Library Items', 'movies + episodes', [
        LIBRARY.free,
        yours(limits?.collection?.item_count, LIBRARY.free),
        vipLimit(limits?.collection?.item_count, LIBRARY.vip),
      ]),
      row('Notes', 'list items + media items + activities', [
        NOTES.free,
        yours(limits?.notes?.item_count, NOTES.free),
        vipLimit(limits?.notes?.item_count, NOTES.vip),
      ]),
      row('Saved Filters', 'shows + movies + calendars', [
        SAVED_FILTERS.free,
        yours(limits?.saved_filters?.count, SAVED_FILTERS.free),
        vipLimit(limits?.saved_filters?.count, SAVED_FILTERS.vip),
      ]),
    ],
  };
}
