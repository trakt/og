import { z } from 'zod/v4';

const schema = z.object({ user: z.object({ vip: z.boolean().nullish(), joined_at: z.string().nullish() }) });

/** Matches OG's September 2024 grandfathering used by the dashboard and calendar images. */
export function panelAccess(settings: unknown) {
  const parsed = schema.safeParse(settings);
  const user = parsed.success ? parsed.data.user : null;
  return {
    vip: user?.vip === true,
    grandfathered: user?.vip === true || (user?.joined_at?.slice(0, 10) ?? '9999') < '2024-09-11',
  };
}
