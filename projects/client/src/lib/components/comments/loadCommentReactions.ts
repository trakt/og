import { z } from 'zod/v4';
import { reactionTypeSchema } from './reactionTypeSchema.ts';

const rowsSchema = z.array(z.object({
  reaction: z.object({ type: reactionTypeSchema }),
  comment: z.object({ id: z.number().int().positive() }),
}));

/** Fetch the viewer's whole set once, including every page. API's minimal shape is parsed at this boundary. */
export async function loadCommentReactions(request: (path: string) => Promise<Response>) {
  const read = async (page: number): Promise<Map<number, z.infer<typeof reactionTypeSchema>>> => {
    const response = await request(`/users/reactions/comments?extended=min&limit=100&page=${page}`);
    if (!response.ok) throw new Error('Could not load your reactions');
    const rows = rowsSchema.parse(await response.json());
    const total = Number(response.headers.get('x-pagination-page-count') ?? 1);
    if (!Number.isInteger(total) || total < 1) throw new Error('Invalid reaction pagination');
    const next = page < total ? await read(page + 1) : new Map();
    return new Map([...rows.map((row) => [row.comment.id, row.reaction.type] as const), ...next]);
  };
  return await read(1);
}
