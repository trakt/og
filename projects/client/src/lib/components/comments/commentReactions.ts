import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { authenticatedFetch } from '../../auth/authenticatedFetch.ts';
import { userManager } from '../../auth/userManager.ts';
import { toast } from '../toast/toast.svelte.ts';
import { createCommentReactions } from './createCommentReactions.svelte.ts';

/** The browser's shared reaction state. It stays empty on the server. */
export const commentReactions = createCommentReactions({
  request: (path, init) => rawApiFetch({ fetch: authenticatedFetch({ manager: userManager() }), path, init }),
  notify: (message) => toast.error(message),
});
