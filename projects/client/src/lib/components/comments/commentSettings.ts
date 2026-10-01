import { z } from 'zod/v4';

// `/users/settings` comes from the API, so the two fields comments read are parsed here.
const schema = z.object({
  browsing: z.object({
    spoilers: z.object({ comments: z.string().nullish() }).nullish(),
    comments: z.object({ blocked_uids: z.array(z.number().int()) }).nullish(),
  }),
});

export type CommentSettings = {
  /** `browsing.spoilers.comments` is `hide`: every comment is blurred until clicked. */
  readonly hideSpoilers: boolean;
  /** The members whose comments the viewer blocked. */
  readonly blocked: ReadonlySet<number>;
};

/** The viewer's comment settings from the layout's `/users/settings`. Logged out, or an unexpected shape, is none. */
export function commentSettings(settings: unknown): CommentSettings {
  const parsed = schema.safeParse(settings);
  const browsing = parsed.success ? parsed.data.browsing : undefined;
  return {
    hideSpoilers: browsing?.spoilers?.comments === 'hide',
    blocked: new Set(browsing?.comments?.blocked_uids ?? []),
  };
}
