import { z } from 'zod/v4';

type Params = {
  id: number;
  notes: string;
  request: (path: string, body: unknown) => Promise<Response>;
  notify: { success: (message: string) => void; error: (message: string) => void };
};
const errorSchema = z.object({ message: z.string().optional() });

/** API returns 204; keep the dialog and draft available if saving fails. */
export async function saveFavoriteNote({ id, notes, request, notify }: Params): Promise<boolean> {
  try {
    const response = await request(`/sync/favorites/${id}`, { notes: notes.trim() });
    if (response.status === 204) {
      notify.success('Notes saved!');
      return true;
    }
    const body = errorSchema.safeParse(await response.json().catch(() => null));
    if (response.status !== 429) {
      notify.error(body.success && body.data.message ? body.data.message : 'Doh! We ran into some sort of error.');
    }
  } catch {
    notify.error('Doh! We ran into some sort of error.');
  }
  return false;
}
