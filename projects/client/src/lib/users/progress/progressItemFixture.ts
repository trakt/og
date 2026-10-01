import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { ProgressItem } from './ProgressItem.ts';

/** A progress item for specs and the design page: show `id`, 10 aired, 5 watched, overridable. */
export function progressItemFixture(
  id: number,
  overrides: Partial<Omit<ProgressItem, 'show'>> & { show?: Partial<CachedShow> } = {},
): ProgressItem {
  const { show, ...rest } = overrides;
  return {
    show: {
      id,
      slug: `show-${id}`,
      title: `Show ${id}`,
      genres: [],
      runtime: 30,
      airedEpisodes: 10,
      fetchedAt: 0,
      complete: true,
      ...show,
    },
    aired: 10,
    completed: 5,
    plays: 5,
    minutesWatched: 150,
    minutesLeft: 150,
    exact: false,
    ...rest,
  };
}
