import { z } from 'zod/v4';
import type { SharingDraft } from './SharingDraft.ts';

// `sharing_text` comes from the API, and @trakt/api's contract doesn't have it.
const schema = z.object({
  sharing_text: z.object({
    watching: z.string().nullish(),
    watched: z.string().nullish(),
    rated: z.string().nullish(),
  }).nullish(),
});

/** OG fills a blank "Just Rated" with this before it renders the form. */
const RATED_DEFAULT = '[item] [stars]';

/** The Sharing form's starting values from the layout's `/users/settings`. Null for an unexpected shape. */
export function toSharingDraft(settings: unknown): SharingDraft | null {
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return null;
  const text = parsed.data.sharing_text;

  return {
    watching: text?.watching ?? '',
    watched: text?.watched ?? '',
    rated: text?.rated?.trim() ? text.rated : RATED_DEFAULT,
  };
}
