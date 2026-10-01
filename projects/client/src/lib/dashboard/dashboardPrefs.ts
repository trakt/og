import { z } from 'zod/v4';

const START_DAYS = [
  'today',
  'yesterday',
  'two_days_ago',
  'three_days_ago',
  'tomorrow',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

// Each field is OG's `dashboard_*` user column without the prefix, with OG's default when it's missing or unreadable.
const prefsSchema = z.object({
  on_deck_poster: z.enum(['show', 'season']).catch('show'),
  /** `shows-movies` is what OG used before the form was ever saved; the form offers the other four. */
  upcoming_filter: z.enum(['shows-movies', 'shows', 'premieres', 'new-shows', 'finales']).catch('shows-movies'),
  upcoming_start_day: z.enum(START_DAYS).catch('today'),
  upcoming_poster: z.enum(['show', 'season']).catch('show'),
  hide_on_deck: z.boolean().catch(false),
  hide_upcoming: z.boolean().catch(false),
  hide_list: z.boolean().catch(false),
  hide_suggested_people: z.boolean().catch(false),
  hide_stats: z.boolean().catch(false),
  hide_recently_watched: z.boolean().catch(false),
  hide_network: z.boolean().catch(false),
  hide_recommendations: z.boolean().catch(false),
});

/** The dashboard settings with no `/users/settings` field. */
export type DashboardPrefs = z.infer<typeof prefsSchema>;

/** Every signed-in member on this browser, by slug. */
const cookieSchema = z.record(z.string(), z.unknown());

const COOKIE = 'og-dashboard';
/** Browsers cap a cookie's lifetime at 400 days. */
const MAX_AGE = 400 * 86_400;

function members(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = cookieSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function read(value: string | undefined, slug: string): DashboardPrefs {
  return prefsSchema.parse(members(value)[slug] ?? {});
}

// Only what differs from OG's defaults is kept, so the cookie stays small.
function changed(prefs: DashboardPrefs): Partial<DashboardPrefs> {
  const defaults = read(undefined, '');
  return Object.fromEntries(
    Object.entries(prefs).filter(([key, value]) => defaults[key as keyof DashboardPrefs] !== value),
  );
}

function write(value: string | undefined, slug: string, prefs: DashboardPrefs): string {
  const { [slug]: _, ...others } = members(value);
  const own = changed(prefs);
  return JSON.stringify(Object.keys(own).length > 0 ? { ...others, [slug]: own } : others);
}

function browserCookie(): string | undefined {
  const entry = document.cookie.split('; ').find((pair) => pair.startsWith(`${COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE.length + 1)) : undefined;
}

/**
 * The per-browser store for the dashboard settings the API can't hold. It's one cookie, so the server reads it for the
 * panels it loads and the settings form writes it in the browser. The value is JSON of each member's changed
 * fields, `{"<slug>": {"upcoming_filter": "premieres", "hide_list": true}}`.
 */
export const dashboardPrefs = {
  COOKIE,
  START_DAYS,
  defaults: read(undefined, ''),
  /** The member's prefs from the cookie's (decoded) value, with OG's defaults for anything unset. */
  read,
  /** The cookie's next value with the member's prefs replaced, keeping everyone else's. */
  write,
  /** In the browser: save the member's prefs. */
  save(slug: string, prefs: DashboardPrefs): void {
    const next = write(browserCookie(), slug, prefs);
    const secure = location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${COOKIE}=${encodeURIComponent(next)}; path=/; samesite=lax; max-age=${MAX_AGE}${secure}`;
  },
  /** In the browser: the member's prefs as saved. */
  load(slug: string): DashboardPrefs {
    return read(browserCookie(), slug);
  },
};
