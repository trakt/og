import { z } from 'zod/v4';
import { upNextSorts } from '../dashboard/upNextSorts.ts';

const bool = z.boolean().nullish().transform((value) => value === true);
const choice = <T extends string>(values: readonly T[], fallback: T) =>
  z.enum(values).catch(fallback).nullish().transform((value) => value ?? fallback);
const direction = choice(['asc', 'desc'], 'asc');
const progress = z.object({
  sort: choice(upNextSorts.map(({ by }) => by), 'added'),
  sort_how: direction,
  simple_progress: bool,
  refresh: bool,
});
const defaults = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => schema.parse(value ?? {}));
const fullProgress = progress.extend({
  use_last_activity: bool,
  grid_view: bool,
  include_watchlisted: bool,
  include_specials: bool,
});
const mostWatched = (fallback: 'plays' | 'time') =>
  defaults(z.object({
    sort_by: choice(['plays', 'time'], fallback),
    tab: choice(['last_30_days', 'all_time'], 'last_30_days'),
  }));
const schema = z.object({
  progress: defaults(z.object({
    on_deck: defaults(progress.extend({ only_favorites: bool })),
    watched: defaults(fullProgress.extend({ include_collected: bool })),
    collected: defaults(fullProgress.extend({ include_watched: bool })),
  })),
  recommendations: defaults(z.object({ ignore_collected: bool, ignore_watchlisted: bool })),
  calendar: defaults(z.object({
    period: choice(['week', 'month'], 'week'),
    start_day: choice([
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
    ], 'today'),
    layout: choice(['list', 'grid'], 'list'),
    image_type: choice(['logo', 'screenshot', 'fanart', 'thumb', 'banner', 'poster', 'none'], 'logo'),
    hide_specials: bool,
    autoscroll: bool,
  })),
  yir: defaults(z.object({
    shows_most_played: choice(['played', 'watched'], 'played'),
    movies_most_played: choice(['played', 'watched'], 'watched'),
  })),
  profile: defaults(z.object({
    favorites: defaults(
      z.object({ sort_by: z.string().nullish().transform((value) => value || 'random'), sort_how: direction }),
    ),
    most_watched_shows: mostWatched('plays'),
    most_watched_movies: mostWatched('time'),
  })),
});
const response = z.object({ browsing: z.unknown().nullish() });

/** Parses API's browsing fields for. The Search and progress poster controls are cut. */
export function toPanelSettings(settings: unknown) {
  const parsed = response.safeParse(settings);
  const browsing = parsed.success ? parsed.data.browsing : null;
  // API formerly called Up Next's activity sort `activity`; treats it as `added` too.
  const legacy = z.object({
    progress: z.object({ on_deck: z.object({ sort: z.literal('activity') }).loose() }).loose(),
  }).loose().safeParse(browsing);
  const normalized = legacy.success
    ? {
      ...legacy.data,
      progress: { ...legacy.data.progress, on_deck: { ...legacy.data.progress.on_deck, sort: 'added' } },
    }
    : browsing;
  const result = schema.safeParse(normalized ?? {});
  return result.success ? result.data : schema.parse({});
}
