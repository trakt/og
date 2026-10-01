import { redirect } from '@sveltejs/kit';
import type { HeaderUser } from '../../components/header/HeaderUser.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import type { ProfileUser } from '../ProfileUser.ts';
import type { ProgressOptions } from './ProgressOptions.ts';
import { readProgressHide } from './progressHide.ts';
import { progressSort } from './progressSort.ts';
import { isProgressType, type ProgressType, progressTypes } from './progressTypes.ts';

type Params = {
  locals: { token: string | null };
  params: { id: string; type?: string; sort?: string };
  url: URL;
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{
    profile: ProfileUser;
    isSelf: boolean;
    user: HeaderUser | null;
    settings: ViewerSettings | null;
    datePreferences: DatePreferences;
  }>;
};

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

const signIn = (url: URL) => redirect(302, `/auth/signin?redirect_to=${encodeURIComponent(url.pathname + url.search)}`);

/**
 * `/users/:id/progress(/:type)(/:sort_by/:sort_how)`: your own progress only. Someone else's goes to their profile,
 * and a signed-out viewer (or a token that stopped working) signs in and comes back. The rows are computed in the
 * browser from the overlay and the show caches (`ProgressPage.svelte`), so this only reads the URL, the hide cookie
 * and your settings for the tab: sort, view, the sources it includes and how it picks the next episode.
 */
export async function loadProgress({ locals, params, url, cookies, parent }: Params) {
  if (!locals.token) signIn(url);

  const type: ProgressType = params.type && isProgressType(params.type) ? params.type : 'watched';
  const { profile, isSelf, user, settings, datePreferences } = await parent();
  if (!user) signIn(url);
  if (!isSelf) redirect(302, `/users/${profile.slug}`);

  const { kind } = progressTypes[type];
  const progress = settings?.browsing?.progress;
  const saved = type === 'library' ? progress?.collected : progress?.watched;
  const options: ProgressOptions = {
    includeSpecials: Boolean(saved?.include_specials),
    includeWatchlisted: Boolean(saved?.include_watchlisted),
    includeOther: Boolean(
      type === 'library' ? progress?.collected?.include_watched : progress?.watched?.include_collected,
    ),
    useLastActivity: Boolean(saved?.use_last_activity),
  };
  const list = Number.parseInt(url.searchParams.get('list') ?? '', 10);

  return {
    type,
    sort: progressSort({ segments: params.sort, saved }),
    hide: readProgressHide({ cookie: cookies.get('filter-hide-progress'), search: url.searchParams, type: kind }),
    grid: Boolean(saved?.grid_view),
    simple: Boolean(saved?.simple_progress),
    terms: url.searchParams.get('terms')?.trim() ?? '',
    list: list > 0 ? list : undefined,
    page: positiveInt(url.searchParams.get('page'), 1),
    options,
    datePreferences,
  };
}
