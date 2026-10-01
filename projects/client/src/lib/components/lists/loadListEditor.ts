import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { collaboratorsSchema } from '../../users/lists/collaboratorsSchema.ts';
import { editableListSchema } from './editableListSchema.ts';
import { loadFollowerCandidates } from './loadFollowerCandidates.ts';
import type { ListDraft } from './ListDraft.ts';

/** Dialog interaction reads; never mix a failed collaborator read with an empty selection. */
export async function loadListEditor({ fetch, id }: { fetch: typeof globalThis.fetch; id: number | null }) {
  const client = api({ fetch });
  const [candidates, summary, current, personal] = await Promise.all([
    loadFollowerCandidates(fetch),
    id === null ? null : client.users.lists.list.summary({ params: { id: 'me', list_id: String(id) } }),
    id === null ? null : rawApiFetch({ fetch, path: `/lists/${id}/collaborators` }),
    client.users.lists.personal({ params: { id: 'me' }, query: { limit: 1 } }),
  ]);
  if (personal.status !== 200) throw new Error('Could not load your lists');
  const count = Number(personal.headers.get('x-pagination-item-count')) || personal.body.length;
  if (id === null) return { candidates, count, initial: undefined };
  if (summary?.status !== 200 || current?.status !== 200) throw new Error('Could not load this list');
  const list = editableListSchema.parse(summary.body);
  const collaborators = collaboratorsSchema.parse(await current.json());
  const selected = collaborators.map((user) => user.ids.slug ?? user.username);
  const known = new Set(candidates.map((user) => user.slug));
  const initial: ListDraft = {
    name: list.name,
    description: list.description ?? '',
    privacy: list.privacy,
    allow_comments: list.allow_comments,
    display_numbers: list.display_numbers,
    sort_by: list.sort_by ?? 'rank',
    sort_how: list.sort_how ?? 'asc',
    collaborators: selected,
  };
  return {
    count,
    initial,
    candidates: [
      ...candidates,
      ...collaborators.filter((user) => !known.has(user.ids.slug ?? user.username)).map((user) => ({
        slug: user.ids.slug ?? user.username,
        name: user.name ?? user.username,
        avatar: undefined,
      })),
    ],
  };
}
