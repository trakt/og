import { api } from '../api/api.ts';
import { authenticatedFetch } from '../auth/authenticatedFetch.ts';
import { userManager } from '../auth/userManager.ts';
import { type SectionsClient, sectionsClient } from './sectionsClient.ts';

const clients = new Map<boolean, SectionsClient>();

/**
 * The lazy sections' client in the browser: public calls go anonymous, the rest with the signed-in member's token.
 * Only call it from the browser (a section's `load`), since it reaches for the stored user.
 */
export function browserSectionsClient(signedIn: boolean): SectionsClient {
  const existing = clients.get(signedIn);
  if (existing) return existing;

  const viewerFetch = authenticatedFetch({ manager: userManager() });
  const client = sectionsClient({ anonymous: api(), viewer: api({ fetch: viewerFetch }), viewerFetch, signedIn });
  clients.set(signedIn, client);
  return client;
}
