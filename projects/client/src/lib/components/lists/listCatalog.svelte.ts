import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { pickerCatalogSchema } from './pickerCatalogSchema.ts';

let counts = $state.raw<Readonly<Record<string, number>>>({});
let pending: Readonly<Record<string, Promise<void> | undefined>> = {};

/** Summary labels share the small list catalogue, without fetching membership for every poster. */
export const listCatalog = {
  count: (user: string) => counts[user],
  load: (user: string, fetch: typeof globalThis.fetch): Promise<void> => {
    if (counts[user] !== undefined) return Promise.resolve();
    const active = pending[user];
    if (active) return active;
    const before = counts[user];
    const done = rawApiFetch({ fetch, path: '/v3/users/me/lists' }).then(async (response) => {
      if (!response.ok) throw new Error('Lists unavailable');
      const count = pickerCatalogSchema.parse(await response.json()).length;
      if (counts[user] === before) counts = { [user]: count };
    }).finally(() => {
      pending = { ...pending, [user]: undefined };
    });
    pending = { ...pending, [user]: done };
    return done;
  },
  update: (user: string, count: number) => {
    counts = { [user]: count };
  },
};
