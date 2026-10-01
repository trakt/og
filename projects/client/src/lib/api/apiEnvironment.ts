import { env } from '$env/dynamic/public';
import type { TraktApiOptions } from '@trakt/api';

export type ApiEnvironment = TraktApiOptions['environment'];

const ENVIRONMENTS = {
  production: 'https://apiz.trakt.tv',
  // Local API server, without a /v2 prefix.
  local: 'http://localhost:8787',
} as const satisfies Record<string, ApiEnvironment>;

type EnvironmentName = keyof typeof ENVIRONMENTS;

function isEnvironmentName(name: string): name is EnvironmentName {
  return Object.hasOwn(ENVIRONMENTS, name);
}

/** Resolves `PUBLIC_TRAKT_API` (`production` or `local`, default `production`) to a base URL. */
export function apiEnvironment(name: string = env.PUBLIC_TRAKT_API || 'production'): ApiEnvironment {
  if (!isEnvironmentName(name)) {
    throw new Error(`Unknown PUBLIC_TRAKT_API "${name}". Use one of: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }

  return ENVIRONMENTS[name];
}
