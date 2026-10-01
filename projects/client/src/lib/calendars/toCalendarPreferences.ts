import { z } from 'zod/v4';

const schema = z.object({
  user: z.object({ vip: z.boolean().nullish(), joined_at: z.iso.datetime().nullish() }).nullish(),
  browsing: z.object({
    calendar: z.object({
      period: z.enum(['week', 'month']).nullish().catch(null),
      layout: z.enum(['list', 'grid']).nullish().catch(null),
      start_day: z.enum([
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
      ]).nullish().catch(null),
      image_type: z.enum(['logo', 'screenshot', 'fanart', 'thumb', 'banner', 'poster', 'none']).nullish().catch(null),
      autoscroll: z.boolean().nullish(),
      hide_specials: z.boolean().nullish(),
    }).nullish(),
  }).nullish(),
});

/** API settings are shared by the layout. Preserve OG's VIP or pre-September-11-2024 image entitlement. */
export function toCalendarPreferences(settings: unknown) {
  const parsed = schema.safeParse(settings);
  const user = parsed.success ? parsed.data.user : null;
  const calendar = parsed.success ? parsed.data.browsing?.calendar : null;
  const imagesAllowed = user?.vip === true || (user?.joined_at?.slice(0, 10) ?? '9999') < '2024-09-11';
  return {
    period: calendar?.period ?? 'week',
    layout: calendar?.layout ?? 'list',
    startDay: calendar?.start_day ?? 'today',
    imageType: imagesAllowed ? calendar?.image_type ?? 'logo' : 'logo',
    autoscroll: calendar?.autoscroll === true,
    hideSpecials: calendar?.hide_specials === true,
  };
}
