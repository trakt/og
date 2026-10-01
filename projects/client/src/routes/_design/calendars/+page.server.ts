import { loadCalendar } from '../../../lib/calendars/loadCalendar.ts';
import type { HeaderUser } from '../../../lib/components/header/HeaderUser.ts';
import type { DatePreferences } from '../../../lib/settings/DatePreferences.ts';

const VIEWER: HeaderUser = {
  slug: 'og_tester',
  firstName: 'OG',
  avatarUrl: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/leela.png',
  isVip: true,
};
const DATE_PREFERENCES: DatePreferences = {
  order: 'mdy',
  hour24: false,
  timeZone: 'America/New_York',
  weekStartDay: 0,
};

// One show the demo viewer hid from the calendar. Its id won't be on the feed, so nothing actually drops.
const HIDDEN = [{ hidden_at: '2026-01-01T00:00:00.000Z', type: 'show', show: { title: 'Hidden', ids: { trakt: 0 } } }];

// A viewer's own week is a lot shorter than everything hot: keep every sixth row, spread over the week.
async function sample(response: Response) {
  if (!response.ok) return response;
  const rows: unknown = await response.json();
  return Response.json(Array.isArray(rows) ? rows.filter((_, i) => i % 6 === 0) : rows);
}

/**
 * My Shows & Movies without signing in: the real loader and page, on a demo viewer's week. `/calendars/my/media` needs
 * a token, so the demo reads a sample of the public curated feed (same row shape) in its place, and serves the hidden items from a
 * fixture. The demo viewer and their settings stand in for the layout's, which are signed out here.
 */
export async function load({ fetch, url, cookies }) {
  const isVip = url.searchParams.get('vip') !== 'false';
  const demoFetch: typeof fetch = (input, init) => {
    const requested = new URL(input instanceof Request ? input.url : input);
    if (requested.pathname.startsWith('/users/hidden/calendar')) return Promise.resolve(Response.json(HIDDEN));

    const headers = new Headers(init?.headers);
    headers.delete('authorization');
    requested.pathname = requested.pathname.replace('/calendars/my/media/', '/calendars/releases/hot/');
    return fetch(requested, { ...init, headers }).then(sample);
  };

  const calendar = await loadCalendar({
    fetch: demoFetch,
    parent: () =>
      Promise.resolve({
        datePreferences: DATE_PREFERENCES,
        settings: {
          user: { vip: isVip },
          account: { token: 'demo-feed-token' },
          browsing: {
            calendar: {
              hide_specials: true,
              period: url.searchParams.get('period'),
              layout: url.searchParams.get('layout'),
              image_type: url.searchParams.get('image'),
              start_day: url.searchParams.get('day'),
            },
          },
        },
      }),
    url,
    target: 'my',
    slug: 'shows-movies',
    start: url.searchParams.get('start') ?? undefined,
    token: 'demo',
    cookies,
    sidenavHidden: false,
  });

  return { ...calendar, user: { ...VIEWER, isVip }, datePreferences: DATE_PREFERENCES };
}
