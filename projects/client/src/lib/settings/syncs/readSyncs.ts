import { error } from '@sveltejs/kit';
import type { z } from 'zod/v4';
import { rawApiFetch } from '../../api/rawApiFetch.ts';

type ReadSyncsParams<T extends z.ZodType> = {
  fetch: typeof fetch;
  token: string;
  /** Under `/users/syncs`, with its query. */
  path: string;
  schema: T;
};

export type SyncsRead<T> =
  | { readonly status: 'ok'; readonly data: T; readonly headers: Headers }
  | { readonly status: 'expired' }
  | { readonly status: 'missing' };

/**
 * One viewer-only `/users/syncs` read. API serves it, so the body is parsed here. A 401 means the request is unauthorized, which renders the page logged out; a 404 is someone else's sync. Anything else that
 * isn't a valid 200 is a 502, rather than an empty table that looks like no imports.
 */
export async function readSyncs<T extends z.ZodType>(
  { fetch, token, path, schema }: ReadSyncsParams<T>,
): Promise<SyncsRead<z.output<T>>> {
  const response = await rawApiFetch({ fetch, token, path: `/users/syncs${path}` });
  if (response.status === 401) return { status: 'expired' };
  if (response.status === 404) return { status: 'missing' };
  if (response.status !== 200) error(502, 'Trakt is having trouble loading your data syncs.');

  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) error(502, 'Trakt returned invalid data syncs.');
  return { status: 'ok', data: parsed.data, headers: response.headers };
}
