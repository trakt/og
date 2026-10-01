import type { z } from 'zod/v4';
import type { hiddenRowsSchema } from './hiddenRowsSchema.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { formatDate } from '../../utils/formatDate.ts';
import type { DatePreferences } from '../../settings/DatePreferences.ts';

type Row = z.infer<typeof hiddenRowsSchema>[number];
type Image = NonNullable<NonNullable<Row['show']>['images']>['poster'];
function imagePath(image: Image) {
  return typeof image === 'string'
    ? image
    : Array.isArray(image)
    ? image.at(0)
    : image?.thumb ?? image?.medium ?? image?.full;
}
/** Missing/deleted objects are omitted; seasons retain the parent title for sorting and display. */
export function toHiddenItem(row: Row, dates: DatePreferences) {
  const item = row[row.type];
  if (!item) return null;
  const user = row.type === 'user' ? row.user : null;
  const media = row.type === 'user' ? null : row[row.type];
  const id = item.ids.trakt ?? item.ids.slug;
  if (id === undefined || id === null) return null;
  const title = user
    ? user.name?.trim() || user.username
    : row.type === 'season'
    ? media?.title || (media?.number === 0 ? 'Specials' : `Season ${media?.number ?? ''}`)
    : media?.title ?? 'Unknown item';
  const parentTitle = row.type === 'season' ? row.show?.title ?? undefined : undefined;
  return {
    key: `${row.type}:${id}`,
    id,
    type: row.type,
    title,
    parentTitle,
    sortTitle: `${parentTitle ?? title}${row.type === 'season' ? ` ${media?.number ?? ''}` : ''}`.toLowerCase().replace(
      /^(the |an |a )/,
      '',
    ),
    image: user
      ? imagePath(user.images?.avatar) ?? undefined
      : imageUrl(imagePath(media?.images?.poster ?? row.show?.images?.poster), 'thumb'),
    hiddenAt: row.hidden_at,
    date: formatDate(row.hidden_at, { ...dates, time: true }),
  };
}
