import { parseFadeHide } from '../components/filters/fadeHide.ts';
import { creditHideOptions } from './creditHideOptions.ts';
import { creditSorts } from './creditSorts.ts';
import type { CreditsQuery } from './CreditsQuery.ts';

/**
 * Reads OG's person query string: `?sort=released,desc&display=movie&terms=walter`. In `sort`, `desc` means the
 * direction arrow is flipped (`people.js:205`), not descending. No `display` means both types.
 */
export function toCreditsQuery(search: URLSearchParams): CreditsQuery {
  const [by, how] = (search.get('sort') ?? '').split(',');
  const display = search.get('display')?.split(',');
  return {
    fade: parseFadeHide(search.get('fade') ?? undefined),
    hide: (search.get('hide') ?? '').split(',').flatMap((id) => {
      const option = creditHideOptions.find((option) => option.id === id);
      return option ? [option.id] : [];
    }),
    sort: creditSorts.find(({ id }) => id === by)?.id ?? 'released',
    reversed: how === 'desc',
    terms: search.get('terms') ?? '',
    movies: !display || display.includes('movie'),
    shows: !display || display.includes('show'),
  };
}
