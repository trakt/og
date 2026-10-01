import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { writeMediaTool } from './writeMediaTool.ts';
import { reportReasons } from './reportReasons.ts';
import { validateReport } from './validateReport.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const target = { type: 'movie', id: 1, title: 'Fight Club (1999)', href: '/movies/fight-club-1999' } as const;
const report = { kind: 'report', target, reason: 'duplicate', message: '  Correct item: /movies/correct  ' } as const;

function respond(status: number, body?: unknown) {
  server.use(
    http.post(
      'https://apiz.trakt.tv/*',
      () => body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status }),
    ),
  );
}

describe('validateReport', () => {
  it('should require a supported reason and a nonblank message', () => {
    expect(validateReport({ type: 'movie', reason: '', message: '  ' })).toEqual({ reason: true, message: true });
    expect(validateReport({ type: 'person', reason: 'runtime', message: 'Wrong' }).reason).toBe(true);
    expect(validateReport({ type: 'user', reason: 'metadata', message: 'Wrong' }).reason).toBe(true);
    expect(validateReport({ type: 'episode', reason: 'runtime', message: 'Wrong' })).toEqual({
      reason: false,
      message: false,
    });
  });
  it('should allow a blank message for Not English', () => {
    expect(validateReport({ type: 'movie', reason: 'language', message: '' })).toEqual({
      reason: false,
      message: false,
    });
  });
  it('should allow a blank message on a comment for Not English and Too Short only', () => {
    expect(validateReport({ type: 'comment', reason: 'too_short', message: '' }).message).toBe(false);
    expect(validateReport({ type: 'comment', reason: 'spoilers', message: ' ' }).message).toBe(true);
    expect(validateReport({ type: 'movie', reason: 'too_short', message: 'Short' }).reason).toBe(true);
  });
  it('should offer only the reasons the API accepts for a user or person', () => {
    expect(reportReasons('user').map(({ value }) => value)).toEqual(['adult', 'language', 'spam', 'other']);
    expect(reportReasons('person').some(({ value }) => value === 'runtime')).toBe(false);
    expect(reportReasons('season')).toHaveLength(10);
  });
});

describe('writeMediaTool', () => {
  it('should send only the API reason and trimmed message and accept an empty 201', async () => {
    let received: unknown;
    server.use(http.post('https://apiz.trakt.tv/movies/1/report', async ({ request }) => {
      received = await request.json();
      expect(request.headers.get('trakt-api-key')).toBeTruthy();
      return new HttpResponse(null, { status: 201 });
    }));
    const result = await writeMediaTool({ fetch, action: report });
    expect(received).toEqual({ reason: 'duplicate', message: 'Correct item: /movies/correct' });
    expect(result.ok).toBe(true);
  });

  it('should report a comment by its id with the comment toast', async () => {
    let received: unknown;
    server.use(http.post('https://apiz.trakt.tv/comments/7/report', async ({ request }) => {
      received = await request.json();
      return new HttpResponse(null, { status: 201 });
    }));
    const comment = { type: 'comment', id: 7, title: '', href: '/comments/7' } as const;
    const result = await writeMediaTool({
      fetch,
      action: { kind: 'report', target: comment, reason: 'too_short', message: '' },
    });
    expect(received).toEqual({ reason: 'too_short', message: '' });
    expect(result).toEqual({ ok: true, message: "Comment reported! Thanks for the info, we'll investigate soon." });
  });

  it.each(['show', 'season', 'episode', 'person', 'user'] as const)(
    'should report a %s at its own API route',
    async (type) => {
      const plural = type === 'person' ? 'people' : `${type}s`;
      server.use(
        http.post(
          `https://apiz.trakt.tv/${plural}/someone%20else/report`,
          () => new HttpResponse(null, { status: 201 }),
        ),
      );
      expect(
        (await writeMediaTool({
          fetch,
          action: { ...report, reason: 'other', target: { ...target, type, id: 'someone else' } },
        })).ok,
      ).toBe(true);
    },
  );

  it.each([undefined, 'other user'])(
    'should report a list with owner %s using the correct API route',
    async (ownerSlug) => {
      const path = ownerSlug ? '/users/other%20user/lists/7/report' : '/lists/7/report';
      server.use(http.post(`https://apiz.trakt.tv${path}`, () => new HttpResponse(null, { status: 201 })));
      expect(
        await writeMediaTool({
          fetch,
          action: { ...report, target: { type: 'list', id: 7, title: 'Heist Night', href: '/lists/7', ownerSlug } },
        }),
      )
        .toEqual({ ok: true, message: "List reported! Thanks for the info, we'll investigate soon." });
    },
  );

  it('should reject invalid reports before sending a request', async () => {
    expect((await writeMediaTool({ fetch, action: { ...report, message: ' ' } })).ok).toBe(false);
  });

  it.each(['refresh', 'justwatch'] as const)('should queue %s with an empty POST', async (kind) => {
    server.use(
      http.post(
        `https://apiz.trakt.tv/movies/1/${kind === 'refresh' ? 'refresh' : 'refresh/justwatch'}`,
        async ({ request }) => {
          expect(await request.text()).toBe('');
          return new HttpResponse(null, { status: 201 });
        },
      ),
    );
    expect((await writeMediaTool({ fetch, action: { kind, target } })).ok).toBe(true);
  });

  it('should prevent unsupported refresh requests', async () => {
    expect((await writeMediaTool({ fetch, action: { kind: 'refresh', target: { ...target, type: 'episode' } } })).ok)
      .toBe(false);
    expect((await writeMediaTool({ fetch, action: { kind: 'justwatch', target: { ...target, type: 'person' } } })).ok)
      .toBe(false);
  });

  it('should retain the API explanation for pending reports and reporting bans', async () => {
    respond(409, { message: 'You already have a pending report for this item.' });
    expect(await writeMediaTool({ fetch, action: report })).toEqual({
      ok: false,
      message: 'You already have a pending report for this item.',
    });
  });

  it('should explain a recent-refresh conflict with no body', async () => {
    respond(409);
    expect((await writeMediaTool({ fetch, action: { kind: 'refresh', target } })).message).toContain(
      'recently refreshed',
    );
  });

  it.each([401, 403, 429, 500])('should fail without a success message on %i', async (status) => {
    respond(status);
    expect((await writeMediaTool({ fetch, action: report })).ok).toBe(false);
  });

  it('should reject a malformed proxied response', async () => {
    respond(201, { message: 42 });
    expect((await writeMediaTool({ fetch, action: report })).ok).toBe(false);
  });

  it('should handle network failure', async () => {
    server.use(http.post('https://apiz.trakt.tv/*', () => HttpResponse.error()));
    expect((await writeMediaTool({ fetch, action: report })).ok).toBe(false);
  });
});
