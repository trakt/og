import { error } from '@sveltejs/kit';
import { api } from '../../api/api.ts';
import { extractPageMeta } from '../../api/extractPageMeta.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { type FadeHide, parseFadeHide } from '../../components/filters/fadeHide.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import { toHistoryDays } from '../history/toHistoryCard.ts';
import { ratingQuery } from './ratingQuery.ts';
import { ratingRowsSchema } from './ratingRowsSchema.ts';
import { sortRatings } from './sortRatings.ts';
import { toRatingCard } from './toRatingCard.ts';
import type { RatingCard } from './RatingCard.ts';

type Params = {
  fetch: typeof fetch;
  locals: { token: string | null };
  params: { id: string; type?: string; filters?: string };
  url: URL;
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{ profile: ProfileUser; isSelf: boolean; datePreferences: DatePreferences }>;
};
const positive = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

async function read({ fetch, id, token, query, current, limit }: {
  fetch: typeof globalThis.fetch;
  id: string;
  token: string | null;
  query: ReturnType<typeof ratingQuery>;
  current: number;
  limit: number;
}) {
  const localSort = query.by !== 'added' || query.how !== 'asc';
  const client = api({ fetch, token });
  const request = { params: { id }, query: { extended: 'full,images' as const, page: current, limit } };
  if (!localSort && query.rating !== 'all') {
    const response = await client.users.ratings.typedRating({
      ...request,
      params: { id, type: query.type, rating: query.rating },
    });
    return { status: response.status, body: response.body, headers: response.headers };
  }
  if (!localSort && query.type !== 'seasons') {
    const response = await client.users.ratings[query.type](request);
    return { status: response.status, body: response.body, headers: response.headers };
  }
  // The numeric-limit contract cannot express the worker's limit=all; unfiltered seasons has no contract.
  const pathType = query.type === 'all' && query.rating === 'all' ? '' : `/${query.type}`;
  const stars = query.rating === 'all' ? '' : `/${query.rating}`;
  const search = new URLSearchParams({
    extended: 'full,images',
    limit: localSort ? 'all' : String(limit),
    ...(localSort ? {} : { page: String(current) }),
  });
  const response = await rawApiFetch({
    fetch,
    token,
    path: `/users/${encodeURIComponent(id)}/ratings${pathType}${stars}?${search}`,
  });
  return {
    status: response.status,
    body: response.ok ? await response.json().catch(() => null) : null,
    headers: response.headers,
  };
}

/** Public ratings alongside the profile frame. Private profiles retry with the viewer token; SSR never refreshes. */
export async function loadRatings({ fetch, locals, params, url, cookies, parent }: Params) {
  const query = ratingQuery(params.type ? `${params.type}/${params.filters ?? ''}` : params.filters);
  const current = positive(url.searchParams.get('page'), 1);
  const limit = Math.min(positive(url.searchParams.get('limit'), 60), 250);
  const request = { fetch, id: params.id, query, current, limit };
  const fetchRatings = (token: string | null) =>
    read({ ...request, token }).catch(() => ({
      status: 502,
      body: null,
      headers: new Headers(),
    }));
  const [anonymous, { profile, isSelf, datePreferences }] = await Promise.all([
    fetchRatings(null),
    parent(),
  ]);
  const shell = {
    query,
    isSelf,
    datePreferences,
    fadeHide: { fade: parseFadeHide(cookies.get('filter-fade-ratings')), hide: [] } satisfies FadeHide,
    dividers: cookies.get('filter-hide-dividers') !== '1',
  };
  if (profile.isLocked) {
    return { ...shell, cards: [] as RatingCard[], days: [], total: 0, page: extractPageMeta(new Headers(), current) };
  }
  const viewer = profile.isPrivate && locals.token ? await fetchRatings(locals.token) : null;
  const result = viewer?.status === 200 ? viewer : anonymous;
  if (result.status === 404) error(404, 'Page Not Found');
  if (result.status !== 200) error(502, 'Trakt is having trouble loading these ratings.');
  const parsed = ratingRowsSchema.safeParse(result.body);
  if (!parsed.success) error(502, 'Trakt is having trouble loading these ratings.');
  const localSort = query.by !== 'added' || query.how !== 'asc';
  const total = localSort
    ? parsed.data.length
    : positive(result.headers.get('x-pagination-item-count'), parsed.data.length);
  const headers = localSort
    ? new Headers({
      'x-pagination-page': String(current),
      'x-pagination-page-count': String(Math.max(1, Math.ceil(total / limit))),
    })
    : result.headers;
  const page = extractPageMeta(headers, current);
  const pageNumber = page.current;
  const rows = localSort
    ? sortRatings(parsed.data, query).slice((pageNumber - 1) * limit, pageNumber * limit)
    : parsed.data;
  const cards = rows.map((row) => toRatingCard(row, { ...query, datePreferences })).filter((card): card is RatingCard =>
    card !== null
  );
  return { ...shell, cards, days: query.by === 'added' ? toHistoryDays(cards, datePreferences) : [], total, page };
}
