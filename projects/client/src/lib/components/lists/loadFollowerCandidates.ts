import { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
const schema = z.array(
  z.object({
    user: z.object({
      username: z.string(),
      name: z.string().nullish(),
      ids: z.object({ slug: z.string().nullish() }),
      images: z.object({ avatar: z.object({ full: z.string().nullish() }).nullish() }).nullish(),
    }),
  }),
);
/** The native contract omits limit; use its supported limit=all rather than dropping followers after page one. */
export async function loadFollowerCandidates(fetch: typeof globalThis.fetch) {
  const response = await rawApiFetch({ fetch, path: '/users/me/followers?limit=all&extended=full' });
  if (!response.ok) throw new Error('Could not load followers');
  return schema.parse(await response.json()).map(({ user }) => ({
    slug: user.ids.slug ?? user.username,
    name: user.name ? `${user.name} (@${user.ids.slug ?? user.username})` : `@${user.ids.slug ?? user.username}`,
    avatar: user.images?.avatar?.full ?? undefined,
  }));
}
