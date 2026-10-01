import type { ListItemType } from './listItemSorts.ts';

/** Which list the page shows: they differ in the types they hold. */
export type ListKind = 'personal' | 'official' | 'watchlist' | 'favorites';

const types: Readonly<Record<ListItemType, string>> = {
  movie: 'Movies',
  show: 'Shows',
  season: 'Seasons',
  episode: 'Episodes',
  person: 'People',
};

/**
 * The type dropdown after All Types: favorites hold movies and shows, the watchlist no
 * people, and every other list all five.
 */
export function listTypeOptions(kind: ListKind): readonly { readonly type: ListItemType; readonly label: string }[] {
  const allowed: readonly ListItemType[] = kind === 'favorites'
    ? ['movie', 'show']
    : kind === 'watchlist'
    ? ['movie', 'show', 'season', 'episode']
    : ['movie', 'show', 'season', 'episode', 'person'];
  return allowed.map((type) => ({ type, label: types[type] }));
}
