import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { fakeUser } from '../auth/fakeUser.ts';
import { fakeUserManager } from '../auth/fakeUserManager.ts';
import { saveSettings } from './saveSettings.ts';
import { setDarkKnight } from './setDarkKnight.ts';
import { settingsRequest } from './settingsRequest.ts';
import type { SettingsBody } from './toSettingsPatch.ts';

const API = 'https://apiz.trakt.tv';
const seen: Array<{ method: string; body: unknown; bearer: string | null }> = [];
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const answer = (status: number, body?: unknown) =>
  http.put(`${API}/users/settings`, async ({ request }) => {
    seen.push({ method: request.method, body: await request.json(), bearer: request.headers.get('authorization') });
    return body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status });
  });

// Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);

function viewerSave(body: SettingsBody) {
  const { manager } = fakeUserManager({ current: fakeUser('viewer-token', 3600) });
  const request = settingsRequest(authenticatedFetch({ manager, baseFetch: passthrough }));
  return saveSettings({ request, body, email: null, avatar: null });
}

function setup(theme?: string) {
  const root: { dataset: DOMStringMap } = { dataset: theme === undefined ? {} : { theme } };
  const reload = vi.fn(() => Promise.resolve());
  const notify = vi.fn();
  return { root, reload, notify };
}

describe('setDarkKnight', () => {
  it('should switch the page and save the setting as the viewer', async () => {
    server.use(answer(201));
    const { root, reload, notify } = setup('light');

    const pending = setDarkKnight({ value: 'true', save: viewerSave, reload, notify, root });
    expect(root.dataset.theme).toBe('dark');

    expect(await pending).toBe(true);
    expect(seen).toEqual([
      { method: 'PUT', body: { browsing: { dark_knight: 'true' } }, bearer: 'Bearer viewer-token' },
    ]);
    expect(reload).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
    expect(root.dataset.theme).toBe('dark');
  });

  it('should save Auto as the string API reads', async () => {
    server.use(answer(201));
    const { root, reload, notify } = setup('dark');

    expect(await setDarkKnight({ value: 'auto', save: viewerSave, reload, notify, root })).toBe(true);
    expect(seen.at(0)?.body).toEqual({ browsing: { dark_knight: 'auto' } });
    expect(root.dataset.theme).toBe('system');
  });

  it('should put the old theme back and say why when the save fails', async () => {
    server.use(answer(400, { message: 'Nope' }));
    const { root, reload, notify } = setup('system');

    expect(await setDarkKnight({ value: 'false', save: viewerSave, reload, notify, root })).toBe(false);
    expect(root.dataset.theme).toBe('system');
    expect(reload).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Nope');
  });

  it('should drop the theme again when the page had none', async () => {
    server.use(answer(500));
    const { root, reload, notify } = setup();

    expect(await setDarkKnight({ value: 'true', save: viewerSave, reload, notify, root })).toBe(false);
    expect(root.dataset).toEqual({});
    expect(notify).toHaveBeenCalledWith("Trakt couldn't save your settings. Please try again.");
  });
});
