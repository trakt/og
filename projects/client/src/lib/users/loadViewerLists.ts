import { z } from 'zod/v4';
import type { api } from '../api/api.ts';
import type { ViewerLists } from './toViewerRelation.ts';

type Response = { readonly status: number; readonly body: unknown };
const userRow = z.object({ user: z.object({ ids: z.object({ slug: z.string().nullish() }) }) });
const list = z.array(userRow);
const requestsList = z.array(userRow.extend({ id: z.number() }));

/** Proxied lists are checked at the boundary. An unavailable or malformed list leaves that state empty. */
async function rows<T>(request: Promise<Response>, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const response = await request.catch(() => null);
  if (response?.status !== 200) return fallback;
  return schema.safeParse(response.body).data ?? fallback;
}

/**
 * The signed-in viewer's own network lists: following, pending follows, followers, blocks and incoming requests. The
 * API doesn't put the viewer's follow state on other users, so it's composed from these. A list that fails is empty.
 */
export async function loadViewerLists({ client }: { client: ReturnType<typeof api> }): Promise<ViewerLists> {
  const me = { params: { id: 'me' }, query: { extended: undefined, limit: 'all' } };
  // Native network routes paginate by default. The contract omits limit, but the worker supports limit=all.

  const [following, pending, followers, blocked, requests] = await Promise.all([
    rows(client.users.following(me), list, []),
    rows(client.users.requests.following({ query: {} }), list, []),
    rows(client.users.followers(me), list, []),
    rows(client.users.blocked(), list, []),
    rows(client.users.requests.follow({ query: {} }), requestsList, []),
  ]);

  return { following, pending, followers, blocked, requests };
}
