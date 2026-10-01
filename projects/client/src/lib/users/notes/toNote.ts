import type { z } from 'zod/v4';
import type { DatePreferences } from '../../settings/DatePreferences.ts';
import { formatDate } from '../../utils/formatDate.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import { toVipBadge } from '../toVipBadge.ts';
import type { noteRowsSchema } from './noteRowsSchema.ts';

type Row = z.infer<typeof noteRowsSchema>[number];
type Image = NonNullable<NonNullable<Row['movie']>['images']>['poster'];

// API sends an image-path array (older responses used size objects); the native worker sends a path.
function posterUrl(image: Image, size: 'thumb' | 'medium' = 'thumb'): string | undefined {
  const path = typeof image === 'string'
    ? image
    : Array.isArray(image)
    ? image.at(0)
    : image?.thumb ?? image?.medium ?? image?.full;
  return imageUrl(path, size);
}

function episodeBadge(item: NonNullable<Row['episode']>) {
  const labels = {
    'series-premiere': 'Series Premiere',
    'season-premiere': 'Season Premiere',
    'mid-season-premiere': 'Mid Season Premiere',
    'mid-season-finale': 'Mid Season Finale',
    'season-finale': 'Season Finale',
    'series-finale': 'Series Finale',
    bonus: 'Bonus Episode',
    trailer: 'Trailer',
  } as const;
  const fallback = item.number === 1 && item.season === 1
    ? 'series-premiere'
    : item.number === 1 && (item.season ?? 0) > 1
    ? 'season-premiere'
    : '';
  const kind = item.episode_type && item.episode_type !== 'standard'
    ? item.episode_type.replaceAll('_', '-')
    : fallback;
  if (!Object.hasOwn(labels, kind)) return undefined;
  const key = kind as keyof typeof labels;
  return { kind: key, label: labels[key] };
}

function itemDetails(row: Row) {
  const item = row[row.type];
  if (!item) return null;
  const slug = item.ids.slug ?? item.ids.trakt;
  const show = row.show;
  const showHref = show ? `/shows/${show.ids.slug ?? show.ids.trakt}` : null;
  const base = {
    id: item.ids.trakt,
    year: item.year,
    fanart: posterUrl(item.images?.fanart, 'medium') ?? posterUrl(row.show?.images?.fanart, 'medium'),
    type: row.type,
    rating: item.rating ?? undefined,
    airedEpisodes: item.aired_episodes ?? undefined,
    episodeBadge: undefined,
    variant: row.type === 'episode' ? 'screenshot' as const : 'poster' as const,
    seasonOf: row.type === 'season' && show && item.number != null
      ? { show: show.ids.trakt, number: item.number }
      : undefined,
    showTitle: row.type === 'episode' || row.type === 'season' ? show?.title ?? null : null,
    showHref: row.type === 'episode' || row.type === 'season' ? showHref : null,
  };
  if (row.type === 'episode') {
    if (!showHref || item.season == null || item.number == null) return null;
    return {
      ...base,
      title: `${item.season}x${String(item.number).padStart(2, '0')} ${item.title ?? 'Episode'}`,
      href: `${showHref}/seasons/${item.season}/episodes/${item.number}`,
      image: posterUrl(item.images?.screenshot),
      episodeBadge: episodeBadge(item),
    };
  }
  if (row.type === 'season') {
    if (!showHref || item.number == null) return null;
    return {
      ...base,
      title: item.title || (item.number === 0 ? 'Specials' : `Season ${item.number}`),
      href: `${showHref}/seasons/${item.number}`,
      image: posterUrl(item.images?.poster) ?? posterUrl(show?.images?.poster),
    };
  }
  const section = { movie: 'movies', show: 'shows', person: 'people' }[row.type];
  return {
    ...base,
    title: item.title ?? item.name ?? 'Unknown item',
    href: `/${section}/${slug}`,
    image: posterUrl(row.type === 'person' ? item.images?.headshot : item.images?.poster),
  };
}

function activity(row: Row, datePreferences: DatePreferences) {
  const attached = row.attached_to;
  const date = { history: attached.watched_at, collection: attached.collected_at, rating: attached.rated_at };
  if (attached.type !== 'history' && attached.type !== 'collection' && attached.type !== 'rating') return null;
  const at = date[attached.type];
  return {
    type: attached.type,
    label: { history: 'History', collection: 'Library', rating: 'Rating' }[attached.type],
    date: at ? formatDate(at, { ...datePreferences, time: true }) : '',
    rating: attached.type === 'rating' ? attached.rating ?? null : null,
  } as const;
}

/** A pure view model; missing nested media is omitted rather than rendering a broken card. */
export function toNote(row: Row, datePreferences: DatePreferences) {
  const item = itemDetails(row);
  if (!item) return null;
  const { note } = row;
  const user = note.user;
  return {
    id: note.id,
    item,
    text: note.notes ?? '',
    privacy: note.privacy,
    spoiler: note.spoiler ?? false,
    // OG only blurs direct media notes, not history, collection or rating notes flagged as spoilers.
    concealed: Boolean(note.spoiler && ['movie', 'show', 'season', 'episode'].includes(row.attached_to.type)),
    updatedAt: note.updated_at,
    updatedDate: formatDate(note.updated_at, { ...datePreferences, time: true }),
    author: {
      name: user?.name?.trim() || user?.username || 'Deleted User',
      href: user ? `/users/${user.ids.slug ?? user.username}` : null,
      avatar: user?.images?.avatar.thumb ?? user?.images?.avatar.full ??
        'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
      vip: user ? toVipBadge(user) : null,
    },
    activity: activity(row, datePreferences),
  };
}
