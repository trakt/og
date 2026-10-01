import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { commentsClient } from '../components/comments/commentsClient.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import { loadWatchNow } from '../components/watchnow/loadWatchNow.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { subpageItemSchema } from '../subpage/subpageItemSchema.ts';
import { subpageWatchNowPath } from '../subpage/subpageWatchNowPath.ts';
import { toSubpageMedia } from '../subpage/toSubpageMedia.ts';

type Params = {
  fetch: typeof globalThis.fetch;
  parent: () => Promise<{ datePreferences: DatePreferences; settings: ViewerSettings | null; user: HeaderUser | null }>;
  id: string;
};

function notFound(): never {
  error(404, 'Comment not found');
}

/**
 * `/comments/:id`: the comment, its item and every reply. A reply redirects to
 * its parent's page at its own anchor. Deleted comments, gone items and lists that aren't public are 404s. Every read
 * is public, so none sends the viewer's token.
 */
export async function loadComment({ fetch, parent, id }: Params) {
  if (!/^\d+$/.test(id)) notFound();
  const client = api({ fetch });
  const [summary, itemResponse, replies, { datePreferences, settings, user }] = await Promise.all([
    // A missing comment is a plain-text 404 under a JSON content type, which the typed client can't parse.
    client.comments.summary({ params: { id } }).catch(() => null),
    rawApiFetch({ fetch, path: `/comments/${id}/item?extended=full,images` }),
    commentsClient(client).replies(Number(id)).catch(() => null),
    parent(),
  ]);

  // `/comments/:id/item` answers the same 404 for a missing comment, so it tells a missing comment from a failure.
  if (summary === null && itemResponse.status === 404) notFound();
  if (summary?.status === 404) notFound();
  if (summary?.status !== 200) error(502, 'The Trakt API could not load this comment.');
  const comment = summary.body;
  // The worker answers `{}` when the comment's member row is gone.
  if (comment.user == null) notFound();
  if (comment.parent_id > 0) redirect(302, `/comments/${comment.parent_id}#comment-${comment.id}`);

  if (itemResponse.status === 404) notFound();
  if (!itemResponse.ok) error(502, 'The Trakt API could not load what this comment is about.');
  const body = subpageItemSchema.safeParse(await itemResponse.json().catch(() => null));
  if (!body.success) error(502, 'The Trakt API returned an invalid comment item.');
  if (replies === null) error(502, 'The Trakt API could not load the replies.');

  const target = subpageWatchNowPath(body.data);
  const watchNow = target
    ? await loadWatchNow({
      fetch,
      ...target,
      country: settings?.browsing?.watchnow?.country?.toLowerCase() || 'us',
      settings,
      isVip: user?.isVip ?? false,
    })
    : null;
  const media = toSubpageMedia({ body: body.data, justwatch: watchNow?.rank?.link });
  if (!media) notFound();

  return { comment, replies, media, watchNow: watchNow?.button ?? null, user, datePreferences };
}
