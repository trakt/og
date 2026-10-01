import type { SearchResultResponse } from '@trakt/api';
import { api } from '../../api/api.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { searchUsersSchema } from '../../search/searchUsersSchema.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { searchTypes } from './searchTypes.ts';
import { type SearchRow, toSearchRow } from './toSearchRow.ts';
import { toSearchUserRow } from './toSearchUserRow.ts';

type SearchAutocompleteParams = {
  type: (typeof searchTypes)[number];
  query: string;
  dates?: Pick<DatePreferences, 'order' | 'timeZone'>;
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

export type SearchAutocompleteResult = {
  readonly rows: ReadonlyArray<SearchRow>;
  /** "View all **N** results". Null hides the row: ID lookups and Users have none. */
  readonly count: string | null;
};

// OG showed 3 rows (`SEARCH_AUTOCOMPLETE_RESULT_COUNT`).
const SHOWN = 3;
// ponytail: the worker's item count is min(total, limit), so a limit=3 call always says 3. Ask for the logged-out
// cap instead, show the first 3 and count up to it ("50+"). Switch to limit=3 once the worker returns the real total.
const COUNT_LIMIT = 50;

const EXTENDED = 'full,images';

// A one-letter username prefix can keep API past the worker's 10s upstream limit (a 504), so Users waits for two.
const USERS_MIN_LENGTH = 2;
// Ask for a few more than we show: the API also returns deleted and private accounts, which OG never listed.
const USERS_LIMIT = 10;

const toRows = (hits: ReadonlyArray<SearchResultResponse>, dates: SearchAutocompleteParams['dates']) =>
  hits.map((hit) => toSearchRow(hit, dates)).filter((row) => row !== null).slice(0, SHOWN);

const toCount = (count: number) => count >= COUNT_LIMIT ? `${COUNT_LIMIT}+` : count.toLocaleString('en-US');

const none: SearchAutocompleteResult = { rows: [], count: null };

// OG matched public, active members by username prefix and drew no "View all" row for it.
async function searchUsers({ query, fetch, signal }: Pick<SearchAutocompleteParams, 'query' | 'fetch' | 'signal'>) {
  if (query.length < USERS_MIN_LENGTH) return none;

  const params = new URLSearchParams({ query, limit: String(USERS_LIMIT), extended: 'full' });
  const response = await rawApiFetch({ fetch, path: `/search/user?${params}`, init: { signal } });
  if (response.status !== 200) return none;

  const users = searchUsersSchema.safeParse(await response.json().catch(() => null));
  if (!users.success) return none;

  const rows = users.data
    .filter(({ user }) => !user.private && !user.deleted)
    .slice(0, SHOWN)
    .map(({ user }) => toSearchUserRow(user));
  return { rows, count: null };
}

/** The header dropdown's results for one type and query. */
export async function searchAutocomplete(
  { type, query, dates, fetch, signal }: SearchAutocompleteParams,
): Promise<SearchAutocompleteResult> {
  const client = api({ fetch });
  const fetchOptions = { signal };

  if ('idType' in type) {
    const response = await client.search.lookup({
      params: { id_type: type.idType, id: query },
      query: { extended: EXTENDED },
      fetchOptions,
    });
    return response.status === 200 ? { rows: toRows(response.body, dates), count: null } : none;
  }

  if (type.slug === 'users') return searchUsers({ query, fetch, signal });

  if (!('text' in type)) return none;

  const response = await client.search.query({
    params: { type: type.text },
    query: { query, limit: COUNT_LIMIT, extended: EXTENDED },
    fetchOptions,
  });
  if (response.status !== 200) return none;

  const count = Number(response.headers.get('x-pagination-item-count') ?? response.body.length);
  return { rows: toRows(response.body, dates), count: count > 0 ? toCount(count) : null };
}
