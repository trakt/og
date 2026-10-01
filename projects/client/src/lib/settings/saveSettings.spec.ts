import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { fakeUser } from '../auth/fakeUser.ts';
import { fakeUserManager } from '../auth/fakeUserManager.ts';
import { saveSettings } from './saveSettings.ts';
import { settingsFixture } from './settingsFixture.ts';
import type { SettingsDraft } from './SettingsDraft.ts';
import { settingsRequest } from './settingsRequest.ts';
import { toSettingsDraft } from './toSettingsDraft.ts';
import { toSettingsPatch } from './toSettingsPatch.ts';

const API = 'https://apiz.trakt.tv';
const seen: Array<{ path: string; method: string; body: unknown; bearer: string | null }> = [];
const record = async (request: Request) => {
  seen.push({
    path: new URL(request.url).pathname,
    method: request.method,
    body: await request.json(),
    bearer: request.headers.get('authorization'),
  });
};
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

// Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);

function viewer(signinSilent?: () => Promise<ReturnType<typeof fakeUser> | null>) {
  const { manager } = fakeUserManager({ current: fakeUser('viewer-token', 3600), signinSilent });
  return settingsRequest(authenticatedFetch({ manager, baseFetch: passthrough }));
}

const body = { user: { username: 'renamed' }, account: { timezone: 'London' } };

describe('saveSettings', () => {
  it('should send the settings, the email and the avatar as the viewer', async () => {
    server.use(
      http.put(`${API}/users/settings`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
      http.put(`${API}/users/email`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
      http.put(`${API}/users/avatar`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await saveSettings({
      request: viewer(),
      body,
      email: 'new@example.com',
      avatar: 'data:image/png;base64,AAAA',
    });

    expect(result).toEqual({ saved: true, errors: [] });
    expect(seen).toEqual([
      { path: '/users/settings', method: 'PUT', body, bearer: 'Bearer viewer-token' },
      {
        path: '/users/email',
        method: 'PUT',
        body: { account: { email: 'new@example.com' } },
        bearer: 'Bearer viewer-token',
      },
      {
        path: '/users/avatar',
        method: 'PUT',
        body: { user: { avatar: 'data:image/png;base64,AAAA' } },
        bearer: 'Bearer viewer-token',
      },
    ]);
  });

  it("should send the preference panels' changes as one nested JSON body, without Only Favorites", async () => {
    server.use(http.put(`${API}/users/settings`, async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 201 });
    }));
    const before = toSettingsDraft(settingsFixture) as SettingsDraft;
    const patch = toSettingsPatch({
      before,
      after: {
        ...before,
        listPopupAction: 'watchlist',
        watchNowFavorites: ['gb-bbc_iplayer', 'us-hulu', 'fr-canal_plus'],
        watchNowOnlyFavorites: false,
        commentSpoilers: 'hide',
      },
    });

    expect(await saveSettings({ request: viewer(), body: patch.body, email: null, avatar: null })).toEqual({
      saved: true,
      errors: [],
    });
    expect(seen.at(0)?.body).toEqual({
      browsing: {
        list_popup_action: 'watchlist',
        watchnow: { favorites: ['gb-bbc_iplayer', 'us-hulu', 'fr-canal_plus'] },
        spoilers: { comments: 'hide' },
      },
    });
  });

  it('should skip the calls with nothing to send', async () => {
    server.use(http.put(`${API}/users/settings`, async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 201 });
    }));

    expect(await saveSettings({ request: viewer(), body, email: null, avatar: null })).toEqual({
      saved: true,
      errors: [],
    });
    expect(seen.map(({ path }) => path)).toEqual(['/users/settings']);
    expect(await saveSettings({ request: viewer(), body: null, email: null, avatar: null })).toEqual({
      saved: false,
      errors: [],
    });
  });

  it("should show API' validation messages and still send the other calls", async () => {
    server.use(
      http.put(
        `${API}/users/settings`,
        () => HttpResponse.json({ message: 'Username renamed is already taken' }, { status: 400 }),
      ),
      http.put(
        `${API}/users/email`,
        () => HttpResponse.json({ message: 'Email address new@example.com is invalid' }, { status: 400 }),
      ),
      http.put(`${API}/users/avatar`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await saveSettings({
      request: viewer(),
      body,
      email: 'new@example.com',
      avatar: 'data:image/png;base64,AAAA',
    });

    expect(result).toEqual({
      saved: true,
      errors: ['Username renamed is already taken', 'Email address new@example.com is invalid'],
    });
    expect(seen.map(({ path }) => path)).toEqual(['/users/avatar']);
  });

  it('should retry a spent token once, then say the session expired', async () => {
    const bearers: Array<string | null> = [];
    server.use(
      http.put(`${API}/users/settings`, ({ request }) => {
        bearers.push(request.headers.get('authorization'));
        return new HttpResponse(null, { status: 401 });
      }),
      http.put(`${API}/users/email`, () => new HttpResponse(null, { status: 401 })),
    );

    const result = await saveSettings({
      request: viewer(() => Promise.resolve(fakeUser('renewed-token', 3600))),
      body,
      email: 'new@example.com',
      avatar: null,
    });

    expect(bearers).toEqual(['Bearer viewer-token', 'Bearer renewed-token']);
    expect(result).toEqual({
      saved: false,
      errors: ['Your session has expired. Sign in again to save your settings.'],
    });
  });

  it('should fall back to a generic message for a server error or a network failure', async () => {
    server.use(
      http.put(`${API}/users/settings`, () => new HttpResponse('oops', { status: 500 })),
      http.put(`${API}/users/avatar`, () => HttpResponse.error()),
    );

    const result = await saveSettings({ request: viewer(), body, email: null, avatar: 'data:image/png;base64,AAAA' });

    expect(result).toEqual({
      saved: false,
      errors: [
        "Trakt couldn't save your settings. Please try again.",
        "Trakt couldn't upload your avatar. Please try again.",
      ],
    });
  });
});
