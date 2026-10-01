import { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { ReportTarget } from './ReportTarget.ts';
import { validateReport } from './validateReport.ts';

type Action =
  | { readonly kind: 'report'; readonly target: ReportTarget; readonly reason: string; readonly message: string }
  | { readonly kind: 'refresh' | 'justwatch'; readonly target: ReportTarget };
const messageSchema = z.object({ message: z.string().optional() });
const failed = 'Doh! We ran into some sort of error. Please try again.';

/** Reports and queued refreshes have no overlay slice to patch. Keep pending state in the calling control. */
export async function writeMediaTool({ fetch, action }: { fetch: typeof globalThis.fetch; action: Action }) {
  const { target, kind } = action;
  if (kind === 'report') {
    const errors = validateReport({ type: target.type, reason: action.reason, message: action.message });
    if (errors.reason || errors.message) return { ok: false, message: 'Please choose a reason and type in a message.' };
  } else if (!['movie', 'show', 'person'].includes(target.type) || (kind === 'justwatch' && target.type === 'person')) {
    return { ok: false, message: 'This item cannot be refreshed.' };
  }

  const plural = target.type === 'person' ? 'people' : `${target.type}s`;
  const suffix = kind === 'justwatch' ? 'refresh/justwatch' : kind;
  try {
    const response = await rawApiFetch({
      fetch,
      path: target.type === 'list' && target.ownerSlug
        ? `/users/${encodeURIComponent(target.ownerSlug)}/lists/${encodeURIComponent(target.id)}/${suffix}`
        : `/${plural}/${encodeURIComponent(target.id)}/${suffix}`,
      init: {
        method: 'POST',
        ...(kind === 'report'
          ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: action.reason, message: action.message.trim() }),
          }
          : {}),
      },
    });
    // API normally returns an empty 201. Conflicts and reporting bans carry a JSON message.
    const text = await response.text();
    const body = text.trim() ? messageSchema.parse(JSON.parse(text)) : null;
    if (!response.ok) {
      return {
        ok: false,
        message: body?.message ??
          (response.status === 409 && kind !== 'report'
            ? 'This item was recently refreshed. Please try again later.'
            : response.status === 403
            ? 'This action requires VIP membership.'
            : failed),
      };
    }
    const success = kind === 'report'
      ? `${target.type.charAt(0).toUpperCase()}${
        target.type.slice(1)
      } reported! Thanks for the info, we'll investigate soon.`
      : `Queued ${target.title} for a ${kind === 'justwatch' ? 'JustWatch' : 'data'} refresh.`;
    return { ok: true, message: success };
  } catch {
    return { ok: false, message: failed };
  }
}
