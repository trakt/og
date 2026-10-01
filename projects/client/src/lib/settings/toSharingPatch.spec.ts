import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { fakeUser } from '../auth/fakeUser.ts';
import { fakeUserManager } from '../auth/fakeUserManager.ts';
import { saveSettings } from './saveSettings.ts';
import { settingsRequest } from './settingsRequest.ts';
import { toSharingPatch } from './toSharingPatch.ts';

const before = { watching: "I'm watching [item]", watched: 'I just watched [item]', rated: '[item] [stars]' };

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('toSharingPatch', () => {
  it('should send only the texts that changed', () => {
    expect(toSharingPatch({ before, after: { ...before, rated: 'Rated [item] [stars]' } })).toEqual({
      sharing_text: { rated: 'Rated [item] [stars]' },
    });
    expect(toSharingPatch({ before, after: { ...before, watching: '', watched: 'Done: [item]' } })).toEqual({
      sharing_text: { watching: '', watched: 'Done: [item]' },
    });
  });

  it('should send nothing when nothing changed', () => {
    expect(toSharingPatch({ before, after: { ...before } })).toBeNull();
  });

  it('should save the texts with PUT /users/settings as the viewer', async () => {
    const seen: unknown[] = [];
    server.use(http.put('https://apiz.trakt.tv/users/settings', async ({ request }) => {
      seen.push([request.headers.get('authorization'), await request.json()]);
      return new HttpResponse(null, { status: 201 });
    }));
    const { manager } = fakeUserManager({ current: fakeUser('viewer-token', 3600) });
    // Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
    const request = settingsRequest(authenticatedFetch({ manager, baseFetch: (...args) => globalThis.fetch(...args) }));

    const body = toSharingPatch({ before, after: { ...before, watched: 'Done: [item]' } });
    const result = await saveSettings({ request, body, email: null, avatar: null });

    expect(result).toEqual({ saved: true, errors: [] });
    expect(seen).toEqual([['Bearer viewer-token', { sharing_text: { watched: 'Done: [item]' } }]]);
  });
});
