import type { z } from 'zod/v4';
import type { Source } from '../../components/watchnow/watchNow.ts';
import { formatDate } from '../../utils/formatDate.ts';
import type { DatePreferences } from '../DatePreferences.ts';
import type { syncItemSchema } from './syncItemSchema.ts';
import { syncService } from './syncService.ts';

type SyncItem = z.output<typeof syncItemSchema>;

/** A line of a cell. OG opened its search links in a new tab; `bad` is a red line inside a green cell. */
export type SyncItemLine = {
  readonly text: string;
  readonly href?: string;
  readonly newTab?: boolean;
  readonly bad?: boolean;
};

/** One cell. `tone` is OG's `sync-good` (green) or `sync-bad` (red): red is what caused the skip. */
export type SyncItemCell = {
  readonly lines: readonly SyncItemLine[];
  readonly tone?: 'good' | 'bad';
  /** The Watch Link column: the service's tile, opening the item on it when OG knew how. */
  readonly service?: Source & { readonly href: string };
};

export type SyncItemTable = {
  /** OG titled each skipped table by its section: "History", or "Ratings". Null when a page mixes them. */
  readonly section: 'History' | 'Ratings' | null;
  readonly headers: readonly string[];
  /** OG right-aligned the last column, except Younify's Progress (`.not-aligned`). */
  readonly endAligned: boolean;
  readonly rows: readonly (readonly SyncItemCell[])[];
};

type ToSyncItemTableParams = {
  items: readonly SyncItem[];
  /** Younify's table or Plex's. */
  layout: 'younify' | 'plex';
  sources: ReadonlyMap<string, Source>;
  datePreferences: DatePreferences;
};

const unknown: SyncItemCell = { lines: [{ text: 'unknown' }], tone: 'bad' };

// OG's season_x_episode: "1x05", or "Special 3" for season 0.
const sxe = (season: number, number: number) =>
  season === 0 ? `Special ${number}` : `${season}x${String(number).padStart(2, '0')}`;

// The search tab a Plex title looks itself up on.
const SEARCH_TABS: Readonly<Record<string, string>> = { movie: 'movies', episode: 'episodes' };

const withYear = (title: string, year?: number | null) => year ? `${title} (${year})` : title;

// Ruby prints a float's `.0`: "100.0%", "4.9%".
const percent = (progress: number) => `${Number.isInteger(progress) ? progress.toFixed(1) : progress}%`;

/** The Trakt Item column: the item the importer matched, with its show above an episode. */
function traktItem(item: SyncItem): SyncItemCell {
  const resolved = item.trakt_item;
  if (!resolved) return unknown;
  if (resolved.type === 'movie') {
    return {
      tone: 'good',
      lines: [{
        text: withYear(resolved.title, resolved.year),
        href: `/movies/${resolved.ids.slug ?? resolved.ids.trakt}`,
      }],
    };
  }
  if (resolved.type === 'show') {
    return {
      tone: 'good',
      lines: [{
        text: withYear(resolved.title, resolved.year),
        href: `/shows/${resolved.ids.slug ?? resolved.ids.trakt}`,
      }],
    };
  }
  const show = resolved.show;
  const showPath = show ? `/shows/${show.ids.slug ?? show.ids.trakt}` : null;
  const episode = { text: `${sxe(resolved.season, resolved.number)} ${resolved.title ?? ''}`.trim() };
  return {
    tone: 'good',
    lines: [
      ...(show && showPath ? [{ text: withYear(show.title, show.year), href: showPath }] : []),
      showPath ? { ...episode, href: `${showPath}/seasons/${resolved.season}/episodes/${resolved.number}` } : episode,
    ],
  };
}

// The service's own page for the item, where OG knew the URL.
function contentLink(item: SyncItem, type: string) {
  const id = item.content_id;
  if (!id) return '';
  switch (item.service_id) {
    case 'amazon':
      return `https://amazon.com/gp/video/detail/${id}`;
    case 'netflix':
      return `https://netflix.com/watch/${id}`;
    case 'disneyplus':
      return `https://disneyplus.com/play/${id}`;
    case 'appletv':
      return `https://tv.apple.com/${type}/${id}`;
    case 'hulu':
      return `https://hulu.com/watch/${id}`;
    case 'hbomax':
      return `https://play.max.com/video/watch/${id}`;
    default:
      return '';
  }
}

const idLookup = (kind: 'tmdb' | 'imdb', id: string | number, type: string): SyncItemCell => ({
  tone: 'good',
  lines: [{ text: String(id), href: `/search/${kind}?query=${encodeURIComponent(id)}&id_type=${type}`, newTab: true }],
});

function younifyRow(item: SyncItem, { sources, datePreferences }: ToSyncItemTableParams): SyncItemCell[] {
  const type = item.tmdb_id ? (item.tmdb_series_id ? 'episode' : 'movie') : null;
  const service = syncService({ kind: 'younify', source: item.service_id, sources });
  return [
    { lines: [{ text: item.watched_at ? formatDate(item.watched_at, { ...datePreferences, time: true }) : '' }] },
    {
      lines: [],
      ...(service.kind === 'tile' && {
        service: { ...service.source, href: contentLink(item, item.tmdb_series_id ? 'episode' : 'movie') },
      }),
    },
    type ? { lines: [{ text: type }], tone: 'good' } : unknown,
    type && item.tmdb_id ? idLookup('tmdb', item.tmdb_id, type) : unknown,
    traktItem(item),
    item.progress === null || item.progress === undefined
      ? unknown
      : { lines: [{ text: percent(item.progress) }], tone: item.progress < 80 ? 'bad' : 'good' },
  ];
}

function plexRow(item: SyncItem, { datePreferences }: ToSyncItemTableParams): SyncItemCell[] {
  const type = item.type ?? 'unknown';
  const date = item.last_watched_at ?? item.watched_at ?? item.rated_at ?? item.collected_at;
  const episode = type === 'episode' && item.season_number !== null && item.season_number !== undefined &&
      item.number !== null && item.number !== undefined
    ? `${sxe(item.season_number, item.number)} `
    : '';
  const title = item.title ? withYear(`${episode}${item.title}`, item.year) : null;
  const hasShow = type === 'episode' || type === 'season';
  const search = (slug: string, query: string) => `/search/${slug}?query=${encodeURIComponent(query)}`;
  return [
    { lines: [{ text: date ? formatDate(date, { ...datePreferences, time: true }) : '' }] },
    { lines: [{ text: type }], tone: 'good' },
    item.ids?.tmdb ? idLookup('tmdb', item.ids.tmdb, type) : unknown,
    item.ids?.imdb ? idLookup('imdb', item.ids.imdb, type) : unknown,
    title
      ? {
        tone: 'good',
        lines: [
          ...(hasShow
            ? [
              item.show_title
                ? { text: item.show_title, href: search('shows', item.show_title), newTab: true }
                : { text: 'unknown show', bad: true },
            ]
            : []),
          {
            text: title,
            href: search(SEARCH_TABS[type] ?? 'shows', `${item.show_title ?? ''} ${title}`.trim()),
            newTab: true,
          },
        ],
      }
      : unknown,
    traktItem(item),
  ];
}

// OG kept a table per section; the API folds them into history and rating items, so og names the page's kind.
function sectionOf(items: readonly SyncItem[]) {
  if (items.every((item) => item.kind === 'history')) return 'History';
  if (items.every((item) => item.kind === 'rating')) return 'Ratings';
  return null;
}

const DATE_HEADERS = { History: 'Watched At', Ratings: 'Rated At' } as const;

/** A page of a sync's paused or skipped items, as OG's Younify or Plex details table. */
export function toSyncItemTable(params: ToSyncItemTableParams): SyncItemTable {
  const section = sectionOf(params.items);
  const date = section ? DATE_HEADERS[section] : 'Date';
  return params.layout === 'younify'
    ? {
      section,
      endAligned: false,
      headers: [date, 'Watch Link', 'Type', 'TMDB ID', 'Trakt Item', 'Progress'],
      rows: params.items.map((item) => younifyRow(item, params)),
    }
    : {
      section,
      endAligned: true,
      headers: [date, 'Type', 'TMDB ID', 'IMDB ID', 'Title', 'Trakt Item'],
      rows: params.items.map((item) => plexRow(item, params)),
    };
}
