import { imageUrl } from '../utils/imageUrl.ts';
import type { ListItemRow } from './listItemRowsSchema.ts';

/**
 * The profile cover on a VIP owner's list: the first ranked item's fanart, with a
 * season or episode using its show's (the API gives seasons and episodes no fanart of their own). People have none.
 */
export function listCoverOf(row: ListItemRow | undefined): string | undefined {
  if (!row || row.type === 'person') return undefined;
  const images = row.type === 'movie' ? row.movie.images : row.show.images;
  return imageUrl(images?.fanart?.at(0), 'full');
}
