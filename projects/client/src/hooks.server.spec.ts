import { readFileSync } from 'node:fs';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { handle } from './hooks.server.ts';
import { load } from './routes/+layout.server.ts';

const APP_HTML = readFileSync(new URL('./app.html', import.meta.url), 'utf8');

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handle = Parameters<typeof handle>[0];

/** A page request through the hook: the root layout loads, then the app shell renders. */
async function render(cookie: string | undefined) {
  const event = {
    cookies: { get: (name: string) => (name === 'og-auth' ? cookie : undefined) },
    locals: {},
    platform: { env: { OG_ADMIN_GATE: 'off' } },
    url: new URL('https://og.trakt.tv/shows/trending'),
  } as unknown as Handle['event'];

  const resolve: Handle['resolve'] = async (resolved, options) => {
    await load({ ...resolved, fetch: (...args) => globalThis.fetch(...args) } as Parameters<typeof load>[0]);
    const html = await options?.transformPageChunk?.({ html: APP_HTML, done: true });
    return new Response(html);
  };

  const response = await handle({ event, resolve });
  return /<html[^>]*>/.exec(await response.text())?.at(0);
}

const darkKnight = (value: string) =>
  server.use(
    http.get('https://apiz.trakt.tv/users/settings', () =>
      HttpResponse.json({
        user: {
          username: 'og_tester',
          name: 'OG Tester',
          vip: false,
          ids: { slug: 'og_tester' },
          images: { avatar: { full: '' } },
        },
        browsing: { dark_knight: value },
      })),
  );

describe('hooks: theme', () => {
  it('should serve the saved Dark Knight theme in the first response', async () => {
    darkKnight('true');
    expect(await render('viewer-token')).toBe('<html lang="en" data-theme="dark">');
    darkKnight('auto');
    expect(await render('viewer-token')).toBe('<html lang="en" data-theme="system">');
    darkKnight('false');
    expect(await render('viewer-token')).toBe('<html lang="en" data-theme="light">');
  });

  it('should serve the light theme when logged out or the token is refused', async () => {
    expect(await render(undefined)).toBe('<html lang="en" data-theme="light">');
    server.use(http.get('https://apiz.trakt.tv/users/settings', () => new HttpResponse(null, { status: 401 })));
    expect(await render('stale-token')).toBe('<html lang="en" data-theme="light">');
  });
});
