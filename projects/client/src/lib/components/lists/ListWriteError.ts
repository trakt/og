import { z } from 'zod/v4';
const errorSchema = z.object({
  message: z.string().nullish(),
  errors: z.record(z.string(), z.array(z.string())).nullish(),
});
export class ListWriteError extends Error {
  constructor(readonly status: number, readonly fields: Readonly<Record<string, readonly string[]>>, message: string) {
    super(message);
  }
  static async from(response: Response) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    return new ListWriteError(
      response.status,
      parsed.success ? parsed.data.errors ?? {} : {},
      parsed.success ? parsed.data.message ?? 'Could not save this list.' : 'Could not save this list.',
    );
  }
}
