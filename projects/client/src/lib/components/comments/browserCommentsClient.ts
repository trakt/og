import { api } from '../../api/api.ts';
import { authenticatedFetch } from '../../auth/authenticatedFetch.ts';
import { userManager } from '../../auth/userManager.ts';
import { type CommentsClient, commentsClient } from './commentsClient.ts';

let client: CommentsClient | undefined;

/** Public comment reads never send the viewer token; authenticated writes use their own client. */
export function browserCommentsClient(): CommentsClient {
  if (!client) {
    const reads = commentsClient(api({ fetch: globalThis.fetch }));
    const fetch = authenticatedFetch({ manager: userManager() });
    const writes = commentsClient(api({ fetch }), fetch);
    // The summary is publicly cached for one minute in the browser and three at the worker. A post-write
    // read needs a new cache key, or it would replace the optimistic total with the pre-write response.
    const freshReads = commentsClient(api({
      fetch: (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input);
        url.searchParams.set('og_reaction', crypto.randomUUID());
        return globalThis.fetch(url, { ...init, cache: 'no-store' });
      },
    }));
    client = {
      ...writes,
      replies: reads.replies,
      reactionSummary: (id, fresh = false) => (fresh ? freshReads : reads).reactionSummary(id),
    };
  }

  return client;
}
