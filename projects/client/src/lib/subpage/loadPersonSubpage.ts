import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { loadSubpageMedia } from './loadSubpageMedia.ts';
import { toPersonSubpageMedia } from './toPersonSubpageMedia.ts';

type Params = Omit<Parameters<typeof loadSubpageMedia>[0], 'item'> & { id: string };

/**
 * {@link loadSubpageMedia} for a person: the same frame data from the public person summary, with no arrows and no
 * Watch Now (OG's partial skips people). A non-canonical URL redirects to the slug's.
 */
export async function loadPersonSubpage({ fetch, parent, id, suffix }: Params) {
  const [summary, { user, settings, datePreferences }] = await Promise.all([
    api({ fetch }).people.summary({ params: { id }, query: { extended: 'full,images' } }),
    parent(),
  ]);
  if (summary.status === 404) error(404, 'Person not found');
  if (summary.status !== 200) error(502, 'The Trakt API could not load this person.');

  const media = toPersonSubpageMedia(summary.body);
  if (summary.body.ids.slug !== id) redirect(301, `${media.href}/${suffix}`);

  return { media, previous: undefined, next: undefined, watchNow: null, user, settings, datePreferences };
}
