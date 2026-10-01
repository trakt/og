import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { checkinMedia } from './checkinMedia.ts';
import type { CheckinTarget } from './CheckinTarget.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const target: CheckinTarget = { type: 'movie', id: 432, fullTitle: 'Fight Club (1999)', topTitle: 'Fight Club' };

function setup() {
  const notify = { success: vi.fn(), error: vi.fn() };
  const request = (path: string, body?: unknown) =>
    rawApiFetch({
      path,
      init: body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) },
    });
  return {
    target,
    message: "I'm watching Fight Club (1999)",
    request,
    notify,
    now: () => new Date('2026-09-29T12:00:00Z'),
  };
}

describe('checkinMedia', () => {
  it('should post the item and message without sharing flags', async () => {
    let body: unknown;
    server.use(http.post(`${API}/checkin`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json({ id: 1 }, { status: 201 });
    }));
    const params = setup();

    expect(await checkinMedia(params)).toBe(true);
    expect(body).toEqual({ movie: { ids: { trakt: 432 } }, message: "I'm watching Fight Club (1999)" });
    expect(params.notify.success).toHaveBeenCalledWith('You checked in to Fight Club (1999).');
  });

  it('should name the current check-in and the wait on a conflict', async () => {
    server.use(
      http.post(`${API}/checkin`, () => HttpResponse.json({ expires_at: '2026-09-29T12:42:30Z' }, { status: 409 })),
      http.get(`${API}/users/me/watching`, () =>
        HttpResponse.json({
          type: 'episode',
          show: { title: 'Breaking Bad' },
          episode: { season: 1, number: 1, title: 'Pilot' },
        })),
    );
    const params = setup();

    expect(await checkinMedia(params)).toBe(false);
    expect(params.notify.error).toHaveBeenCalledWith(
      'You are already checked in to Breaking Bad 1x01 "Pilot". Please wait 42 minutes.',
    );
  });

  it('should still explain a conflict when nothing is playing any more', async () => {
    server.use(
      http.post(`${API}/checkin`, () => HttpResponse.json({ expires_at: '2026-09-29T12:01:10Z' }, { status: 409 })),
      http.get(`${API}/users/me/watching`, () => new HttpResponse(null, { status: 204 })),
    );
    const params = setup();

    await checkinMedia(params);
    expect(params.notify.error).toHaveBeenCalledWith('You are already checked in. Please wait 1 minute.');
  });

  it('should say an unreleased item cannot be checked into', async () => {
    server.use(http.post(`${API}/checkin`, () => HttpResponse.json({ message: 'x' }, { status: 422 })));
    const params = setup();

    await checkinMedia(params);
    expect(params.notify.error).toHaveBeenCalledWith("You can't check in to an unreleased item.");
  });

  it('should stay quiet when rate limited', async () => {
    server.use(http.post(`${API}/checkin`, () => new HttpResponse(null, { status: 429 })));
    const params = setup();

    expect(await checkinMedia(params)).toBe(false);
    expect(params.notify.error).not.toHaveBeenCalled();
  });

  it('should fall back to the generic error', async () => {
    server.use(http.post(`${API}/checkin`, () => new HttpResponse(null, { status: 500 })));
    const params = setup();

    await checkinMedia(params);
    expect(params.notify.error).toHaveBeenCalledWith("Doh! You can't check into this item.");
  });
});
