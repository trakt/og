import { z } from 'zod/v4';
import { countLabel } from '../../utils/countLabel.ts';
import { episodeNumber } from '../media/episodeTags.ts';
import type { CheckinTarget } from './CheckinTarget.ts';

type Params = {
  target: CheckinTarget;
  message: string;
  /** Authenticated. A body makes it a POST. */
  request: (path: string, body?: unknown) => Promise<Response>;
  notify: { success: (message: string) => void; error: (message: string) => void };
  now?: () => Date;
};

const conflictSchema = z.object({ expires_at: z.string() });
const watchingSchema = z.object({
  movie: z.object({ title: z.string(), year: z.number().nullish() }).nullish(),
  show: z.object({ title: z.string() }).nullish(),
  episode: z.object({ season: z.number(), number: z.number(), title: z.string().nullish() }).nullish(),
});

/** The API's 409 has no title, so ask what's playing. API's conflict toast named it. */
async function currentTitle(request: Params['request']): Promise<string | null> {
  const response = await request('/users/me/watching');
  if (response.status !== 200) return null;
  const { movie, show, episode } = watchingSchema.parse(await response.json());
  if (movie) return movie.year ? `${movie.title} (${movie.year})` : movie.title;
  if (!show || !episode) return null;
  return `${show.title} ${episodeNumber(episode, null)}${episode.title ? ` "${episode.title}"` : ''}`;
}

async function conflict({ request, now = () => new Date() }: Params, response: Response): Promise<string> {
  const { expires_at: expiresAt } = conflictSchema.parse(await response.json());
  const minutes = Math.max(0, Math.floor((Date.parse(expiresAt) - now().getTime()) / 60_000));
  const title = await currentTitle(request).catch(() => null);
  return `You are already checked in${title ? ` to ${title}` : ''}. Please wait ${countLabel(minutes, 'minute')}.`;
}

/**
 * `POST /checkin` (API). Sharing flags are left out: the X, Mastodon and Tumblr integrations are gone.
 * Resolves true when the check-in started.
 */
export async function checkinMedia(params: Params): Promise<boolean> {
  const { target, message, request, notify } = params;
  try {
    const response = await request('/checkin', { [target.type]: { ids: { trakt: target.id } }, message });
    if (response.ok) {
      notify.success(`You checked in to ${target.fullTitle}.`);
      return true;
    }
    if (response.status === 429) return false;
    if (response.status === 409) notify.error(await conflict(params, response));
    else if (response.status === 422) notify.error("You can't check in to an unreleased item.");
    else notify.error("Doh! You can't check into this item.");
  } catch {
    notify.error("Doh! You can't check into this item.");
  }
  return false;
}
