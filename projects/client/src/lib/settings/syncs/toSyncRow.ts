import type { z } from 'zod/v4';
import type { Source } from '../../components/watchnow/watchNow.ts';
import { countLabel } from '../../utils/countLabel.ts';
import { formatDate } from '../../utils/formatDate.ts';
import type { DatePreferences } from '../DatePreferences.ts';
import type { syncSchema } from './syncSchema.ts';
import { type SyncService, syncService } from './syncService.ts';

type Sync = z.output<typeof syncSchema>;
type Section = keyof Sync['items'];

export type SyncColumn = {
  readonly section: Section;
  /** "6 movies", "231 episodes": hidden once the sync is undone, as OG did. */
  readonly added: readonly string[];
  /** "4 paused", "5,155 skipped", linking to the sync's details. Only the History column has them. */
  readonly details: readonly string[];
};

export type SyncRow = {
  readonly id: number;
  readonly date: string;
  readonly service: SyncService;
  readonly columns: readonly SyncColumn[];
  readonly undone: boolean;
  /** What Undo removes, for its confirmation. */
  readonly removes: Readonly<Record<'history' | 'paused' | 'library' | 'ratings' | 'watchlist', number>>;
};

// OG's columns and the types each one counts.
const SECTIONS: ReadonlyArray<readonly [Section, ReadonlyArray<'movies' | 'episodes' | 'shows' | 'seasons'>]> = [
  ['history', ['movies', 'episodes']],
  ['library', ['movies', 'episodes']],
  ['ratings', ['movies', 'episodes', 'shows', 'seasons']],
  ['watchlist', ['movies', 'episodes', 'shows', 'seasons']],
];

const added = (sync: Sync, section: Section) =>
  (SECTIONS.find(([key]) => key === section)?.[1] ?? []).flatMap((type) => {
    const count = sync.items[section]?.[type] ?? 0;
    return count > 0 ? [countLabel(count, type.slice(0, -1))] : [];
  });

const total = (sync: Sync, section: Section) =>
  Object.values(sync.items[section] ?? {}).reduce<number>((sum, count) => sum + (count ?? 0), 0);

// The API totals paused and skipped items across every section, so both sit under History, where Younify and
// Plex put almost all of them.
const details = (sync: Sync) => [
  ...(sync.paused_count > 0 ? [`${sync.paused_count.toLocaleString('en-US')} paused`] : []),
  ...(sync.skipped_count > 0 ? [`${sync.skipped_count.toLocaleString('en-US')} skipped`] : []),
];

type ToSyncRowParams = {
  sync: Sync;
  sources: ReadonlyMap<string, Source>;
  datePreferences: DatePreferences;
};

/** One row of OG's syncs table. */
export function toSyncRow({ sync, sources, datePreferences }: ToSyncRowParams): SyncRow {
  return {
    id: sync.id,
    date: formatDate(sync.created_at, { ...datePreferences, time: true }),
    service: syncService({ ...sync, sources }),
    columns: SECTIONS.map(([section]) => ({
      section,
      added: sync.undone ? [] : added(sync, section),
      details: section === 'history' ? details(sync) : [],
    })),
    undone: sync.undone,
    removes: {
      history: total(sync, 'history'),
      paused: sync.paused_count,
      library: total(sync, 'library'),
      ratings: total(sync, 'ratings'),
      watchlist: total(sync, 'watchlist'),
    },
  };
}
