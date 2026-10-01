import { z } from 'zod/v4';

const errorSchema = z.object({ message: z.string().optional() });

/** OG's list write failure toast (`lists.js:1036-1040`): the API's message, or its generic one. */
export async function listWriteError(response?: Response): Promise<string> {
  const body = errorSchema.safeParse(await response?.json().catch(() => null));
  return (body.success && body.data.message) || 'Doh! We ran into some sort of error.';
}
