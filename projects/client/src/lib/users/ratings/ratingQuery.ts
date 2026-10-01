import { ratingTypes } from './ratingTypes.ts';
import { ratingSorts } from './ratingSorts.ts';

/** The OG path is /ratings/:type/:rating/:sort_by/:sort_how; asc means the sort's natural order. */
export function ratingQuery(segments = '') {
  const [inputType = 'all', inputRating = 'all', inputSort = 'added', inputHow] = segments.split('/');
  const type = Object.keys(ratingTypes).find((type): type is keyof typeof ratingTypes => type === inputType) ?? 'all';
  const rating = /^(10|[1-9])$/.test(inputRating) ? inputRating : 'all';
  const by = Object.keys(ratingSorts[type]).find((by): by is keyof typeof ratingSorts.movies => by === inputSort) ??
    'added';
  return { type, rating, by, how: inputHow === 'desc' ? 'desc' as const : 'asc' as const };
}
