import { error, redirect } from '@sveltejs/kit';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import type { HeaderUser } from '../../components/header/HeaderUser.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { hiddenSections } from './hiddenSections.ts';
import { hiddenRowsSchema } from './hiddenRowsSchema.ts';
import { toHiddenItem } from './toHiddenItem.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  parent: () => Promise<{ user: HeaderUser | null; datePreferences: DatePreferences }>;
  params: { type?: string };
  url: URL;
};
async function read({ fetch, locals }: Params, section: string, page: number) {
  const response = await rawApiFetch({
    fetch,
    token: locals.token,
    path: `/users/hidden/${section}?extended=full,images&page=${page}&limit=250`,
  });
  if (response.status === 401) return null;
  if (response.status !== 200) error(502, 'Trakt is having trouble loading your hidden items.');
  const parsed = hiddenRowsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) error(502, 'Trakt returned invalid hidden items.');
  return { rows: parsed.data, page: extractPageMeta(response.headers, page) };
}
export async function loadHidden(params: Params) {
  const type = params.params.type ?? 'dropped';
  if (!Object.hasOwn(hiddenSections, type)) error(404, 'Page Not Found');
  const selected = type as keyof typeof hiddenSections;
  if (!params.locals.token) {
    redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(params.url.pathname + params.url.search)}`);
  }
  const [first, { user, datePreferences }] = await Promise.all([
    read(params, hiddenSections[selected].section, 1),
    params.parent(),
  ]);
  // A rotated cookie renders logged-out. Only the browser can renew it.
  if (!first || !user) return { type: selected, items: [], expired: true };
  const rows = [...first.rows];
  const pages = first.page.type === 'paginated' ? first.page.total : 1;
  for (let page = 2; page <= pages; page++) {
    const next = await read(params, hiddenSections[selected].section, page);
    if (!next) return { type: selected, items: [], expired: true };
    rows.push(...next.rows);
  }
  return {
    type: selected,
    items: rows.flatMap((row) => {
      const item = toHiddenItem(row, datePreferences);
      return item ? [item] : [];
    }),
    expired: false,
  };
}
