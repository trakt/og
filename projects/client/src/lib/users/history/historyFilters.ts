import { watchDateInstant } from '../../components/history/watchDateInstant.ts';
import { genresFor, type HistoryType } from './historyTypes.ts';

/** One item's plays (`?movie=`, `?show=`, `?season=`, `?episode=`), by Trakt id. */
export type HistoryItem = { readonly type: 'movie' | 'show' | 'season' | 'episode'; readonly id: number };

export type HistoryFilters = {
  readonly item?: HistoryItem;
  /** UTC instants. */
  readonly startAt?: string;
  readonly endAt?: string;
  readonly genre?: string;
  /** The Watch Now picker's comma list of service slugs, as the worker's `watchnow` reads it. */
  readonly watchnow?: string;
};

const ITEM_TYPES = ['movie', 'show', 'season', 'episode'] as const;
const DAY = 86_400_000;

const positiveInt = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * OG's date parsing in the viewer's zone: an instant with an offset stands,
 * and a bare date or wall clock is read in `timeZone`. Anything else is ignored, like OG's rescue.
 */
export function parseInstant(value: string | null, timeZone: string): string | undefined {
  const text = value?.trim() ?? '';
  if (/(Z|[+-]\d\d:?\d\d)$/i.test(text)) {
    const at = Date.parse(text);
    return Number.isFinite(at) ? new Date(at).toISOString() : undefined;
  }
  const wall = text.match(/^(\d{4}-\d\d-\d\d)(?:[T ](\d\d:\d\d))?/);
  if (!wall) return undefined;
  return watchDateInstant(`${wall[1]}T${wall[2] ?? '00:00'}`, timeZone) ?? undefined;
}

/** The page's filters from its query string. */
export function historyFilters(search: URLSearchParams, type: HistoryType, timeZone: string): HistoryFilters {
  const itemType = ITEM_TYPES.find((key) => positiveInt(search.get(key)));
  const startAt = parseInstant(search.get('start_at'), timeZone);
  let endAt = parseInstant(search.get('end_at'), timeZone);
  // `days` with only a start: the end is that many days on, less a second.
  const days = positiveInt(search.get('days'));
  if (startAt && !endAt && days) endAt = new Date(Date.parse(startAt) + days * DAY - 1000).toISOString();

  const genre = search.get('genres') ?? '';
  const genres = genresFor(type);
  const watchnow = search.get('watchnow')?.trim();
  return {
    ...(itemType && { item: { type: itemType, id: positiveInt(search.get(itemType)) ?? 0 } }),
    ...(startAt && { startAt }),
    ...(endAt && { endAt }),
    ...(genres && Object.hasOwn(genres, genre) && { genre }),
    // All Types has a placeholder picker.
    ...(watchnow && type !== 'all' && { watchnow }),
  };
}
