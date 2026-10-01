import { traktApi } from '@trakt/api';
import { type ApiEnvironment, apiEnvironment } from './apiEnvironment.ts';
import { authorizedFetch } from './authorizedFetch.ts';
import { plainTextErrorFetch } from './plainTextErrorFetch.ts';
import { TRAKT_CLIENT_ID } from './traktClientId.ts';

export type ApiParams = {
  /** SvelteKit's `event.fetch` in loaders, the global one in the browser. */
  fetch?: typeof fetch;
  token?: string | null;
  environment?: ApiEnvironment;
};

type RouteArgs = { params?: Readonly<Record<string, unknown>> } | undefined;

/** `args` with every numeric path param as a string. `@ts-rest/core` leaves a falsy one out of the URL, so a 0 vanished. */
function withStringParams(args: RouteArgs): RouteArgs {
  if (!args?.params) return args;
  const params = Object.fromEntries(
    Object.entries(args.params).map(([key, value]) => [key, typeof value === 'number' ? String(value) : value]),
  );
  return { ...args, params };
}

/** `client`, with every route stringifying its numeric path params, so Specials (season 0) keep `/seasons/0`. */
function keepZeroParams<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value === 'function') return (args: RouteArgs) => value(withStringParams(args));
      if (typeof value === 'object' && value !== null) return keepZeroParams(value);
      return value;
    },
  });
}

/**
 * A typed `@trakt/api` client. It sends `trakt-api-key` and `trakt-api-version: 2` itself. The worker's plain-text
 * errors (a stale token's `Unauthorized`) come back as their status instead of a JSON `SyntaxError`, so a loader can
 * render a 401 logged-out.
 */
export function api({ fetch = globalThis.fetch, token, environment = apiEnvironment() }: ApiParams = {}) {
  return keepZeroParams(traktApi({
    apiKey: TRAKT_CLIENT_ID,
    environment,
    fetch: plainTextErrorFetch(authorizedFetch(fetch, token)),
  }));
}
