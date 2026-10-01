import { z } from 'zod/v4';

const listSchema = z.object({
  ids: z.object({ trakt: z.number() }),
  name: z.string(),
  privacy: z.string(),
  item_count: z.number(),
});
/** Create first; callers retain the created list if adding its item or collaborators fails. */
export async function createList({ request, draft }: {
  request: (path: string, body: unknown) => Promise<Response>;
  draft: {
    name: string;
    description: string;
    privacy: string;
    allow_comments: boolean;
    display_numbers: boolean;
    sort_by: string;
    sort_how: string;
  };
}) {
  const response = await request('/users/me/lists', {
    ...draft,
    name: draft.name.trim(),
  });
  if (!response.ok) throw new Error(String(response.status));
  return listSchema.parse(await response.json());
}
