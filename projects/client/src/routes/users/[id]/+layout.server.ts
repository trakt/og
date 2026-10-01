import { error, redirect } from '@sveltejs/kit';
import { api } from '../../../lib/api/api.ts';
import { loadViewerLists } from '../../../lib/users/loadViewerLists.ts';
import { profileResponseSchema } from '../../../lib/users/profileResponseSchema.ts';
import { toViewerRelation } from '../../../lib/users/toViewerRelation.ts';
import { toProfileUser } from '../../../lib/users/toProfileUser.ts';
import { toWatchingNow } from '../../../lib/users/toWatchingNow.ts';

/** The profile and the frame's counts and watching-now bar. Neither of the last two is worth failing the page over. */
async function readFrame(client: ReturnType<typeof api>, id: string) {
  const [profile, stats, watching] = await Promise.all([
    client.users.profile({ params: { id }, query: { extended: 'full,vip' } }),
    client.users.stats({ params: { id } }).catch(() => null),
    client.users.watching({ params: { id }, query: { extended: 'full,images' } }).catch(() => null),
  ]);
  return { profile, stats, watching };
}

/**
 * The profile frame every `/users/:id/*` page shares. Subpage loaders `await parent()` and skip their own requests when
 * `profile.isLocked`: a private profile the viewer can't see renders the frame only, on every subpage.
 */
export async function load({ fetch, locals, params, parent, url }) {
  if (params.id === 'me' && !locals.token) {
    redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname)}`);
  }

  const client = api({ fetch, token: locals.token });
  const [viewerFrame, { user: viewer }] = await Promise.all([readFrame(client, params.id), parent()]);

  // A token that stopped working: `/users/me` signs in again, like OG with no session, and anyone else's profile
  // renders logged-out. The server never refreshes; the browser renews.
  const stale = viewerFrame.profile.status === 401 && locals.token !== null;
  if (stale && params.id === 'me') redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname)}`);
  const { profile, stats, watching } = stale ? await readFrame(api({ fetch }), params.id) : viewerFrame;
  if (profile.status === 404 || (profile.status === 200 && profile.body.deleted)) error(404, 'Page Not Found');
  if (profile.status !== 200) error(502, 'Trakt is having trouble loading this profile.');

  const parsed = profileResponseSchema.safeParse(profile.body);
  if (!parsed.success) error(502, 'Trakt returned an invalid profile response.');
  const user = toProfileUser(parsed.data);
  if (params.id !== user.slug) {
    redirect(
      params.id === 'me' ? 302 : 301,
      url.pathname.replace(`/users/${params.id}`, `/users/${user.slug}`) + url.search,
    );
  }

  const isSelf = viewer?.slug === user.slug;

  if (viewer && !isSelf) locals.viewerLists ??= loadViewerLists({ client });

  return {
    profile: user,
    counts: stats?.status === 200
      ? { followers: stats.body.network.followers, following: stats.body.network.following }
      : null,
    /** The profile page's stat boxes and charts read it too. */
    stats: stats?.status === 200 ? stats.body : null,
    watching: watching?.status === 200 ? toWatchingNow(watching.body) : null,
    isSelf,
    signedIn: viewer !== null,
    // Streamed: the page renders without waiting for the viewer's five network lists.
    relation: viewer && !isSelf
      ? (locals.viewerLists?.then((lists) => toViewerRelation(user.slug, lists)) ?? null)
      : null,
  };
}
