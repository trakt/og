import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TRAKT_CLIENT_ID } from '../lib/api/traktClientId.ts';
import { formatDate } from '../lib/utils/formatDate.ts';
import { load } from './+layout.server.ts';

const SETTINGS = {
  user: {
    username: 'og_tester',
    name: 'OG Tester',
    vip: true,
    ids: { slug: 'og_tester' },
    images: { avatar: { full: 'https://example.test/avatar.png' } },
  },
  account: { timezone: 'Asia/Tokyo', date_format: 'ydm', time_24hr: true },
  browsing: { week_start_day: '1', spoilers: { episodes: 'hide' } },
  sharing: { app: { comment_reply: false }, email: { comment_reply: true }, twitter: { profile: true } },
  limits: { notes: { item_count: 100 } },
};
const seen: Request[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/users/settings', ({ request }) => {
    seen.push(request);
    return HttpResponse.json(SETTINGS);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const layout = (token: string | null = 'fake-token', searchType?: string) =>
  load(
    {
      fetch: globalThis.fetch,
      locals: { token },
      cookies: { get: (name: string) => (name === 'search_type' ? searchType : undefined) },
    } as Parameters<typeof load>[0],
  );

describe('root layout settings', () => {
  it('should load extended settings once and share them with the header and date helpers', async () => {
    const data = await layout();
    expect(seen).toHaveLength(1);
    const request = seen.at(0);
    expect(new URL(request?.url ?? '').searchParams.get('extended')).toBe('browsing,sharing');
    expect(request?.headers.get('authorization')).toBe('Bearer fake-token');
    expect(request?.headers.get('trakt-api-key')).toBe(TRAKT_CLIENT_ID);
    expect(data.hasSession).toBe(true);
    expect(data.settings).toEqual(SETTINGS);
    expect(data.user).toEqual({
      slug: 'og_tester',
      firstName: 'OG',
      isVip: true,
      avatarUrl: SETTINGS.user.images.avatar.full,
    });
    expect(data.datePreferences).toEqual({ order: 'ydm', hour24: true, timeZone: 'Asia/Tokyo', weekStartDay: 1 });
    expect(formatDate('2026-09-29T23:30:00Z', { ...data.datePreferences, time: true })).toBe('2026 30 Sep 08:30');
  });

  it('should preserve optional email and birthday when the API includes them', async () => {
    const user = { ...SETTINGS.user, email: 'tester@example.test', dob: '1990-01-01' };
    server.use(http.get('https://apiz.trakt.tv/users/settings', () => HttpResponse.json({ ...SETTINGS, user })));
    const data = await layout();
    expect(data.settings?.user.email).toBe(user.email);
    expect(data.settings?.user.dob).toBe(user.dob);
  });

  it('should render defaults without fetching when logged out', async () => {
    expect(await layout(null)).toEqual({
      hasSession: false,
      user: null,
      settings: null,
      datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
      searchType: '',
    });
    expect(seen).toHaveLength(0);
  });

  it('should pass the search_type cookie to the header search', async () => {
    expect((await layout(null, 'people')).searchType).toBe('people');
    expect((await layout('fake-token', 'imdb')).searchType).toBe('imdb');
  });

  it.each([401, 403, 429, 500])(
    'should render logged-out defaults on %s while leaving renewal to the client',
    async (status) => {
      server.use(http.get('https://apiz.trakt.tv/users/settings', () => new HttpResponse(null, { status })));
      const data = await layout();
      expect(data).toEqual({ ...(await layout(null)), hasSession: true });
    },
  );

  it.each([
    ['a network error', () => HttpResponse.error()],
    ['invalid JSON', () => new HttpResponse('{', { headers: { 'Content-Type': 'application/json' } })],
    ['a malformed settings response', () => HttpResponse.json({ user: null })],
  ])('should render logged-out defaults for %s', async (_, response) => {
    server.use(http.get('https://apiz.trakt.tv/users/settings', response));
    expect(await layout()).toEqual({ ...(await layout(null)), hasSession: true });
  });

  it('should keep settings isolated between requests and clear them after logout', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/settings', ({ request }) => {
      const slug = request.headers.get('authorization') === 'Bearer first' ? 'first' : 'second';
      return HttpResponse.json({ ...SETTINGS, user: { ...SETTINGS.user, ids: { slug } } });
    }));
    const [first, second] = await Promise.all([layout('first'), layout('second')]);
    expect(first.settings?.user.ids.slug).toBe('first');
    expect(second.settings?.user.ids.slug).toBe('second');
    expect((await layout(null)).settings).toBeNull();
  });
});

describe('root layout theme', () => {
  // The theme the page's <html> renders with (hooks.server.ts writes it).
  const theme = async (token: string | null = 'fake-token') => {
    const locals: App.Locals = { token };
    const cookies = { get: (_name: string): string | undefined => undefined };
    await load({ fetch: globalThis.fetch, locals, cookies } as Parameters<typeof load>[0]);
    return locals.theme;
  };
  const darkKnight = (value: unknown) =>
    server.use(
      http.get('https://apiz.trakt.tv/users/settings', () =>
        HttpResponse.json({ ...SETTINGS, browsing: { ...SETTINGS.browsing, dark_knight: value } })),
    );

  it.each([['true', 'dark'], ['false', 'light'], ['auto', 'system'], ['', 'light']])(
    'should render dark_knight "%s" as the %s theme',
    async (value, expected) => {
      darkKnight(value);
      expect(await theme()).toBe(expected);
    },
  );

  it('should leave the theme to the light default when logged out or the settings fail', async () => {
    expect(await theme(null)).toBeUndefined();
    server.use(http.get('https://apiz.trakt.tv/users/settings', () => new HttpResponse(null, { status: 401 })));
    expect(await theme()).toBeUndefined();
    server.use(http.get('https://apiz.trakt.tv/users/settings', () => HttpResponse.json({ user: null })));
    expect(await theme()).toBeUndefined();
  });
});
