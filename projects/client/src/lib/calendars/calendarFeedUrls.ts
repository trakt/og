import { z } from 'zod/v4';

// /users/settings is API. Validate the fields this feature consumes from the layout response.
const feedSettings = z.object({
  user: z.object({ vip: z.boolean() }),
  account: z.object({ token: z.string().trim().min(1).nullish() }),
});

const paths = {
  'shows-movies': 'media',
  shows: 'shows',
  premieres: 'shows/premieres',
  'new-shows': 'shows/new',
  finales: 'shows/finales',
  movies: 'movies',
  streaming: 'streaming',
  dvd: 'dvd',
} as const;

/** Subscriptions always use apiz, without OAuth headers, dates or the calendar page's filters. */
export function calendarFeedUrls(settings: unknown): Readonly<Record<string, string | null>> {
  const parsed = feedSettings.safeParse(settings);
  const token = parsed.success && parsed.data.user.vip ? parsed.data.account.token : null;
  return Object.fromEntries(
    Object.entries(paths).map(([slug, path]) => [
      slug,
      token ? `https://apiz.trakt.tv/calendars/my/${path}.ics?${new URLSearchParams({ slurm: token })}` : null,
    ]),
  );
}
