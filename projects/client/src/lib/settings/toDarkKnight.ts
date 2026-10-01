import { z } from 'zod/v4';
import type { DarkKnight } from './DarkKnight.ts';

// API sends `dark_knight.to_s`, so an unset value is an empty string.
const schema = z.object({
  browsing: z.object({ dark_knight: z.enum(['false', 'true', 'auto']).catch('false') }).nullish(),
});

/** The viewer's Dark Knight setting from the layout's `/users/settings`. Signed out, or anything unexpected, is Off. */
export function toDarkKnight(settings: unknown): DarkKnight {
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return 'false';
  return parsed.data.browsing?.dark_knight ?? 'false';
}
