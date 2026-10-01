import type { MovieResponse, ShowResponse } from '@trakt/api';
import { countLabel } from '../utils/countLabel.ts';
import { type DateOrder, formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { ChartName } from './chartNames.ts';

// Trending sends `watchers`, anticipated `list_count`, favorited `user_count`, and watched, played and collected
// all four of the last. Box office sends `revenue`. Shows' `collector_count` is owners, and their `collected_count` is episodes.
type Stats = {
  watchers?: number;
  list_count?: number;
  user_count?: number;
  watcher_count?: number;
  play_count?: number;
  collected_count?: number;
  collector_count?: number;
  revenue?: number;
};

/** One chart row. Most charts send rows like this; popular rows are wrapped to match. */
export type ChartRow = ({ show: ShowResponse } | { movie: MovieResponse }) & Stats;

export type ChartCard = {
  type: 'show' | 'movie';
  id: number;
  href: string;
  title: string;
  year?: number;
  image?: string;
  /** Out by `now`. OG hid the rating of anything unreleased or undated . */
  released: boolean;
  rating?: number;
  airedEpisodes?: number;
  runtime?: number;
  /** The labels over the fanart. No kind is the red one. */
  tags: { text: string; kind?: 'list' | 'generic' | 'favorite' | 'collect' }[];
};

type Tag = ChartCard['tags'][number];

// the premiere in the show's own zone, then the network.
function showTags(show: ShowResponse, order: DateOrder): Tag[] {
  const timeZone = show.airs?.timezone;
  return [
    ...(show.first_aired && timeZone
      ? [{ text: formatDate(show.first_aired, { format: 'LL', timeZone, order }) }]
      : []),
    ...(show.network ? [{ text: show.network, kind: 'generic' as const }] : []),
  ];
}

// `released` is a bare date, so it's formatted in UTC to keep the day.
function movieTags(movie: MovieResponse, order: DateOrder): Tag[] {
  return movie.released ? [{ text: formatDate(movie.released, { format: 'LL', timeZone: 'UTC', order }) }] : [];
}

const generic = (text: string): Tag => ({ text, kind: 'generic' });

// The `above_title` per action.
function tags(row: ChartRow, chart: ChartName | 'boxoffice', order: DateOrder): Tag[] {
  const watchers = countLabel(row.watcher_count ?? 0, 'watcher');
  const plays = countLabel(row.play_count ?? 0, 'play');

  switch (chart) {
    case 'trending':
      return [{ text: countLabel(row.watchers ?? 0, 'watcher') }];
    case 'popular':
    case 'recommendations':
      return [];
    case 'anticipated': {
      const list = { text: countLabel(row.list_count ?? 0, 'list'), kind: 'list' as const };
      return [list, ...('show' in row ? showTags(row.show, order) : movieTags(row.movie, order))];
    }
    case 'favorited': {
      const people = row.user_count ?? 0;
      return [{
        text: `${people.toLocaleString('en-US')} ${people === 1 ? 'person' : 'people'} favorited`,
        kind: 'favorite',
      }];
    }
    case 'watched':
      return [{ text: watchers }, generic(plays)];
    case 'played':
      return [{ text: plays }, generic(watchers)];
    case 'library':
      return 'show' in row
        ? [
          { text: countLabel(row.collected_count ?? 0, 'episode'), kind: 'collect' },
          generic(countLabel(row.collector_count ?? 0, 'owner')),
        ]
        : [{ text: countLabel(row.collected_count ?? 0, 'owner'), kind: 'collect' }];
    // the weekend gross in whole dollars, `$0` when there's none.
    case 'boxoffice':
      return [{ text: `$${(row.revenue ?? 0).toLocaleString('en-US')}` }];
  }
}

/**
 * Maps a chart row onto a fanart card. The chart decides which of the row's stats become tags. `now` decides whether
 * the item is out yet, and `order` is the viewer's date format.
 */
export function toChartCard(
  row: ChartRow,
  { chart, now, order }: { chart: ChartName | 'boxoffice'; now: Date; order: DateOrder },
): ChartCard {
  const [type, media] = 'show' in row ? ['show' as const, row.show] : ['movie' as const, row.movie];
  const releaseDate = 'show' in row ? row.show.first_aired : row.movie.released;

  return {
    type,
    id: media.ids.trakt,
    href: `/${type}s/${media.ids.slug}`,
    title: media.title,
    year: media.year ?? undefined,
    image: imageUrl(media.images?.fanart?.at(0), 'thumb'),
    released: releaseDate ? new Date(releaseDate) <= now : false,
    rating: media.rating ?? undefined,
    runtime: media.runtime ?? undefined,
    airedEpisodes: 'show' in row ? (row.show.aired_episodes ?? undefined) : undefined,
    tags: tags(row, chart, order),
  };
}
