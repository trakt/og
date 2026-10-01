import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { fakeUser } from '../auth/fakeUser.ts';
import { fakeUserManager } from '../auth/fakeUserManager.ts';
import { saveSettings } from './saveSettings.ts';
import { settingsRequest } from './settingsRequest.ts';
import { sharingSettingsFixture } from './sharingSettingsFixture.ts';
import { toNotificationsPatch } from './toNotificationsPatch.ts';

const before = sharingSettingsFixture.sharing.app;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function viewer() {
  const { manager } = fakeUserManager({ current: fakeUser('viewer-token', 3600) });
  // Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
  return settingsRequest(authenticatedFetch({ manager, baseFetch: (...args) => globalThis.fetch(...args) }));
}

describe('toNotificationsPatch', () => {
  it('should send only the Trakt Apps toggles that changed', () => {
    expect(toNotificationsPatch({ before, after: { ...before, new_follower: true, mir: false } })).toEqual({
      sharing: { app: { new_follower: true, mir: false } },
    });
  });

  it('should send nothing when nothing changed', () => {
    expect(toNotificationsPatch({ before, after: { ...before } })).toBeNull();
  });

  it('should save the toggles with PUT /users/settings as the viewer', async () => {
    const seen: unknown[] = [];
    server.use(http.put('https://apiz.trakt.tv/users/settings', async ({ request }) => {
      seen.push([request.headers.get('authorization'), await request.json()]);
      return new HttpResponse(null, { status: 201 });
    }));

    const body = toNotificationsPatch({ before, after: { ...before, list_like: true } });
    const result = await saveSettings({ request: viewer(), body, email: null, avatar: null });

    expect(result).toEqual({ saved: true, errors: [] });
    expect(seen).toEqual([['Bearer viewer-token', { sharing: { app: { list_like: true } } }]]);
  });

  it("should list API' message when it refuses the save", async () => {
    server.use(http.put(
      'https://apiz.trakt.tv/users/settings',
      () => HttpResponse.json({ message: 'Something went wrong' }, { status: 400 }),
    ));

    const body = toNotificationsPatch({ before, after: { ...before, list_like: true } });

    expect(await saveSettings({ request: viewer(), body, email: null, avatar: null })).toEqual({
      saved: false,
      errors: ['Something went wrong'],
    });
  });
});
