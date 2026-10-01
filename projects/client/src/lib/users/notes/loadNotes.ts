import { error } from '@sveltejs/kit';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { noteRowsSchema } from './noteRowsSchema.ts';
import { noteTypes } from './noteTypes.ts';
import { toNote } from './toNote.ts';

type Params = {
  fetch: typeof fetch;
  parent: () => Promise<{ profile: ProfileUser; datePreferences: DatePreferences }>;
  locals: { token: string | null };
  params: { id: string; type?: string };
  url: URL;
};

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

export async function loadNotes({ fetch, parent, locals, params, url }: Params) {
  const type = params.type ?? 'all';
  if (!Object.hasOwn(noteTypes, type)) error(404, 'Page Not Found');
  const current = positiveInt(url.searchParams.get('page'), 1);
  const limit = positiveInt(url.searchParams.get('limit'), 30);
  const query = new URLSearchParams({ extended: 'full,images,vip', page: String(current), limit: String(limit) });
  const path = `/users/${encodeURIComponent(params.id)}/notes${type === 'all' ? '' : `/${type}`}?${query}`;
  const [initial, { profile, datePreferences }] = await Promise.all([
    rawApiFetch({ fetch, token: locals.token, path }),
    parent(),
  ]);
  const empty = {
    type: type as keyof typeof noteTypes,
    notes: [],
    itemCount: 0,
    page: extractPageMeta(new Headers(), current),
  };
  if (profile.isLocked) return empty;
  // A rotated/expired cookie must never refresh on the server. Read only public notes until the browser renews.
  const response = initial.status === 401 && locals.token ? await rawApiFetch({ fetch, path }) : initial;
  if (response.status === 404) error(404, 'Page Not Found');
  if (response.status !== 200) error(502, 'Trakt is having trouble loading these notes.');
  const rows = noteRowsSchema.safeParse(await response.json().catch(() => null));
  if (!rows.success) error(502, 'Trakt returned an invalid notes response.');
  return {
    type: type as keyof typeof noteTypes,
    notes: rows.data.flatMap((row) => {
      const note = toNote(row, datePreferences);
      return note ? [note] : [];
    }),
    itemCount: positiveInt(response.headers.get('x-pagination-item-count'), 0),
    page: extractPageMeta(response.headers, current),
  };
}
