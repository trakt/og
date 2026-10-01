import type { z } from 'zod/v4';
import type { ratingRowsSchema } from './ratingRowsSchema.ts';
import type { ratingQuery } from './ratingQuery.ts';

type Row = z.infer<typeof ratingRowsSchema>[number];
const media = (row: Row) =>
  row.type === 'movie' ? row.movie : row.type === 'show' ? row.show : row.type === 'season' ? row.season : row.episode;
const time = (date: string | null | undefined) => date ? Date.parse(date) || 0 : 0;
const title = (row: Row) => (media(row)?.title ?? '').toLowerCase().replace(/^(the |an |a )/, '');

/** OG's natural directions, article-free title sorting and rated-date tie break. Never mutates the API rows. */
export function sortRatings(rows: readonly Row[], { by, how }: ReturnType<typeof ratingQuery>): Row[] {
  const value = (row: Row): number => {
    const item = media(row);
    switch (by) {
      case 'rating':
        return row.rating;
      case 'released':
        return time(item?.first_aired ?? item?.released);
      case 'runtime':
        return item && 'runtime' in item ? item.runtime ?? 0 : 0;
      case 'percentage':
        return item?.rating ?? 0;
      case 'votes':
        return item?.votes ?? 0;
      default:
        return time(row.rated_at);
    }
  };
  const direction = how === 'asc' ? 1 : -1;
  return rows.toSorted((a, b) => {
    const compared = by === 'title' ? title(a).localeCompare(title(b), 'en') : value(b) - value(a);
    return direction * (compared || time(b.rated_at) - time(a.rated_at));
  });
}
