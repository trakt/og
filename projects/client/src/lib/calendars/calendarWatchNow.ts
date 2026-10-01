import { z } from 'zod/v4';
import { favoriteSlugs } from '../components/watchnow/watchNow.ts';

const schema = z.object({
  browsing: z.object({
    watchnow: z.object({
      country: z.string().nullish(),
      favorites: z.array(z.string()).nullish(),
    }).nullish(),
  }).nullish(),
}).nullish();

/** The shared settings already loaded by the layout, including the viewer's country and favorites. */
export function calendarWatchNow(settings: unknown) {
  const result = schema.safeParse(settings);
  const watchnow = result.success ? result.data?.browsing?.watchnow : undefined;
  const country = watchnow?.country?.toLowerCase() || 'us';
  return { country, favorites: favoriteSlugs(watchnow?.favorites ?? [], country, country) };
}
