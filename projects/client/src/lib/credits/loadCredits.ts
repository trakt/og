import { error } from '@sveltejs/kit';
import type { z } from 'zod/v4';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { seasonPeopleSchema } from '../shows/seasonPeopleSchema.ts';
import { loadSubpageMedia } from '../subpage/loadSubpageMedia.ts';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { toCredits } from './toCredits.ts';

type Params = Omit<Parameters<typeof loadSubpageMedia>[0], 'suffix'>;

type People = z.infer<typeof seasonPeopleSchema>;

async function readPeople(fetch: typeof globalThis.fetch, path: string): Promise<People> {
  const response = await rawApiFetch({ fetch, path });
  // The item's own 404 comes from the summary read.
  if (response.status === 404) return {};
  if (!response.ok) error(502, 'The Trakt API could not load the cast and crew.');
  const people = seasonPeopleSchema.safeParse(await response.json().catch(() => null));
  if (!people.success) error(502, 'The Trakt API returned invalid cast and crew data.');
  return people.data;
}

const apiPath = (item: SubpageItem): string => {
  const show = `/shows/${encodeURIComponent(item.id)}`;
  if (item.type === 'movie') return `/movies/${encodeURIComponent(item.id)}`;
  if (item.type === 'show') return show;
  const season = `${show}/seasons/${encodeURIComponent(item.season)}`;
  return item.type === 'season' ? season : `${season}/episodes/${encodeURIComponent(item.episode)}`;
};

/**
 * `/movies/:id/credits`, `/shows/:id/credits` and the season and episode ones. Movies have one Cast tab. Shows and seasons split their Season Regulars from their
 * Guest Stars. An episode's Guest Stars are its whole cast, beside the season's regulars.
 */
export async function loadCredits({ fetch, parent, item }: Params) {
  const path = apiPath(item);
  const [subpage, people, regulars] = await Promise.all([
    loadSubpageMedia({ fetch, parent, item, suffix: 'credits' }),
    readPeople(
      fetch,
      `${path}/people?extended=${item.type === 'show' || item.type === 'season' ? 'guest_stars,' : ''}images`,
    ),
    item.type === 'episode'
      ? readPeople(fetch, `${apiPath({ ...item, type: 'season' })}/people?extended=images`)
      : null,
  ]);
  const actors = item.type === 'movie'
    ? [{ label: 'Cast', members: people.cast }]
    : item.type === 'episode'
    ? [{ label: 'Season Regulars', members: regulars?.cast }, { label: 'Guest Stars', members: people.cast }]
    : [{ label: 'Season Regulars', members: people.cast }, { label: 'Guest Stars', members: people.guest_stars }];
  return {
    ...subpage,
    credits: toCredits({
      actors,
      crew: people.crew,
      episodeCounts: (item.type === 'show' || item.type === 'season') &&
        subpage.settings?.browsing?.spoilers?.actors !== 'hide',
    }),
  };
}
