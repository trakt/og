import { describe, expect, it } from 'vitest';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import { toProfileUser } from '../toProfileUser.ts';
import { loadProgress } from './loadProgress.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const viewer = { slug: 'tester', firstName: 'Tester', avatarUrl: '', isVip: false };

const settings = (progress: Record<string, unknown>) => ({ browsing: { progress } }) as unknown as ViewerSettings;

type Options = {
  type?: string;
  sort?: string;
  query?: string;
  token?: string | null;
  isSelf?: boolean;
  signedIn?: boolean;
  viewerSettings?: ViewerSettings | null;
  cookie?: string;
};
const load = (
  { type, sort, query = '', token = 'token', isSelf = true, signedIn = true, viewerSettings = null, cookie }: Options =
    {},
) =>
  loadProgress({
    locals: { token },
    params: { id: 'tester', type, sort },
    url: new URL(`https://og.trakt.tv/users/tester/progress${query}`),
    cookies: { get: (name: string) => (name === 'filter-hide-progress' ? cookie : undefined) },
    parent: () =>
      Promise.resolve({
        profile,
        isSelf,
        user: signedIn ? viewer : null,
        settings: viewerSettings,
        datePreferences,
      }),
  });

describe('loadProgress', () => {
  it('should send a signed-out viewer to sign in and back', async () => {
    await expect(load({ token: null, query: '?page=2' })).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fusers%2Ftester%2Fprogress%3Fpage%3D2',
    });
  });

  it('should send a token that stopped working to sign in too', async () => {
    await expect(load({ signedIn: false })).rejects.toMatchObject({ status: 302 });
  });

  it("should send someone else's progress to their profile", async () => {
    await expect(load({ isSelf: false })).rejects.toMatchObject({ status: 302, location: '/users/tester' });
  });

  it('should read the tab, sort, page, title search, list and hide toggles from the URL', async () => {
    const result = await load({
      type: 'library',
      sort: 'completed/desc',
      query: '?page=3&terms=%20bad%20&list=42&hide_completed=true',
      cookie: 'ended,rewatching',
    });

    expect(result).toMatchObject({
      type: 'library',
      sort: { by: 'completed', how: 'desc', supported: true },
      page: 3,
      terms: 'bad',
      list: 42,
      // Rewatching is Watched only.
      hide: ['ended', 'completed'],
    });
  });

  it("should take the tab's saved sort, views and sources", async () => {
    const result = await load({
      viewerSettings: settings({
        watched: {
          sort: 'title',
          sort_how: 'desc',
          grid_view: true,
          simple_progress: true,
          include_specials: true,
          include_watchlisted: true,
          include_collected: true,
          use_last_activity: true,
        },
        collected: { include_watched: false },
      }),
    });

    expect(result).toMatchObject({
      type: 'watched',
      sort: { by: 'title', how: 'desc' },
      grid: true,
      simple: true,
      options: { includeSpecials: true, includeWatchlisted: true, includeOther: true, useLastActivity: true },
    });
  });

  it("should read Library's Include Watched from the collected settings", async () => {
    const result = await load({
      type: 'library',
      viewerSettings: settings({ watched: { include_collected: false }, collected: { include_watched: true } }),
    });

    expect(result.options.includeOther).toBe(true);
  });

  it('should default to Watched, Activity Date and page 1', async () => {
    expect(await load({ type: 'nope' })).toMatchObject({
      type: 'watched',
      sort: { by: 'added', how: 'asc' },
      page: 1,
      list: undefined,
    });
  });
});
