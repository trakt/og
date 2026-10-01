import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { Collaborator } from './Collaborator.ts';
import { collaboratorsSchema } from './collaboratorsSchema.ts';

type FetchCollaboratorsParams = {
  /** A plain fetch for public lists (the worker caches those), the signed-in one for the rest. */
  fetch: typeof globalThis.fetch;
  listId: number;
  /** The viewer's token, for a list only they can see. The browser's signed-in fetch sends its own. */
  token?: string | null;
};

/**
 * A list's approved collaborators, for the "N collaborators" pill. Anything but a clean
 * answer is no collaborators: the pill is extra, and a failure shouldn't break the row.
 */
export async function fetchCollaborators({ fetch, listId, token }: FetchCollaboratorsParams): Promise<Collaborator[]> {
  const response = await rawApiFetch({ fetch, token, path: `/lists/${listId}/collaborators` }).catch(() => null);
  if (response?.status !== 200) return [];
  const parsed = collaboratorsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return [];
  return parsed.data.map((user) => ({
    slug: user.ids.slug ?? user.username,
    name: user.name?.trim() || user.username,
  }));
}
