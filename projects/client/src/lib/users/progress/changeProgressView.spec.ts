import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import { settingsRequest } from '../../settings/settingsRequest.ts';
import { changeProgressView } from './changeProgressView.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function setup() {
  const shown: boolean[] = [];
  return {
    shown,
    params: {
      apply: (on: boolean) => shown.push(on),
      request: settingsRequest((...args) => globalThis.fetch(...args)),
      notify: { error: vi.fn() },
    },
  };
}

describe('changeProgressView', () => {
  it.each(
    [
      ['simple_progress', 'watched', true],
      ['grid_view', 'collected', false],
    ] as const,
  )('should save %s for %s progress', async (view, settings, on) => {
    const { shown, params } = setup();
    server.use(http.put(`${API}/users/settings`, async ({ request }) => {
      expect(await request.json()).toEqual({ browsing: { progress: { [settings]: { [view]: on } } } });
      // The new state shows before the API answers.
      expect(shown).toEqual([on]);
      return HttpResponse.json({});
    }));

    expect(await changeProgressView({ ...params, view, settings, on })).toBe(true);
    expect(shown).toEqual([on]);
    expect(params.notify.error).not.toHaveBeenCalled();
  });

  it('should go back to the old state with the error when the save fails', async () => {
    const { shown, params } = setup();
    server.use(http.put(`${API}/users/settings`, () => new HttpResponse(null, { status: 500 })));

    expect(await changeProgressView({ ...params, view: 'simple_progress', settings: 'watched', on: true })).toBe(false);
    expect(shown).toEqual([true, false]);
    expect(params.notify.error).toHaveBeenCalledWith("Trakt couldn't save your settings. Please try again.");
  });

  it('should go back and ask to sign in again when the token is refused', async () => {
    const { shown, params } = setup();
    server.use(http.put(`${API}/users/settings`, () => workerUnauthorized()));

    expect(await changeProgressView({ ...params, view: 'grid_view', settings: 'watched', on: false })).toBe(false);
    expect(shown).toEqual([false, true]);
    expect(params.notify.error).toHaveBeenCalledWith('Your session has expired. Sign in again to save your settings.');
  });
});
