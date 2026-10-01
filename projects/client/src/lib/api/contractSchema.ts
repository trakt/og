import { z } from 'zod/v4';

/** Bridge @trakt/api's Zod 3 contracts into a Zod 4 boundary without duplicating their response schemas. */
export function contractSchema<T>(contract: { safeParse: (body: unknown) => { success: boolean; data?: T } }) {
  return z.unknown().transform((body, context) => {
    const parsed = contract.safeParse(body);
    if (parsed.success && parsed.data !== undefined) return parsed.data;
    context.addIssue({ code: 'custom', message: 'Response does not match the API contract' });
    return z.NEVER;
  });
}
