import { creditSorts } from './creditSorts.ts';
import type { CreditsQuery } from './CreditsQuery.ts';
import type { PersonCredit } from './PersonCredit.ts';

/** One tab's credits as the grid shows them: filtered by type and terms (OG's isotope filter), then sorted. */
export function visibleCredits(credits: readonly PersonCredit[], query: CreditsQuery): PersonCredit[] {
  const sort = creditSorts.find(({ id }) => id === query.sort) ?? creditSorts[0];
  const sign = sort.descending !== query.reversed ? -1 : 1;
  const terms = query.terms.trim().toLowerCase();

  // ponytail: OG treated the terms as a regex; a plain substring can't throw on "(" and matches what people type.
  return credits
    .filter(({ type }) => (type === 'movie' ? query.movies : query.shows))
    .filter(({ title, characters }) =>
      !terms || title.toLowerCase().includes(terms) || characters.toLowerCase().includes(terms)
    )
    .toSorted((a, b) => {
      const x = a.sortBy[sort.key];
      const y = b.sortBy[sort.key];
      return sign * (typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : Number(x) - Number(y));
    });
}
