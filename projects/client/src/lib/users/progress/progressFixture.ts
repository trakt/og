import type { CollectedItem } from '../../overlay/CollectedItem.ts';
import type { CachedShow } from '../../shows/cache/CachedShow.ts';
import type { ShowCatalog } from '../../shows/cache/ShowCatalog.ts';
import type { ProgressItem } from './ProgressItem.ts';
import { toProgressItem } from './toProgressItem.ts';

type Sample = {
  id: number;
  slug: string;
  title: string;
  year: number;
  status: string;
  genres?: string[];
  runtime: number;
  /** Each season's episodes, true once watched. */
  seasons: readonly (readonly boolean[])[];
  seasonTitles?: readonly (string | null)[];
  /** Extra plays on top of one a watched episode. */
  rewatches?: number;
  resetAt?: string;
  /** An episode type, by season and number. */
  types?: Readonly<Record<string, string>>;
};

// Public shows with made-up progress, for the specs and the design demo. No artwork, like local OG.
const samples: readonly Sample[] = [
  {
    id: 1388,
    slug: 'breaking-bad',
    title: 'Breaking Bad',
    year: 2008,
    status: 'ended',
    genres: ['drama'],
    runtime: 47,
    seasons: [Array(7).fill(true), [
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]],
    rewatches: 2,
  },
  {
    id: 1390,
    slug: 'game-of-thrones',
    title: 'Game of Thrones',
    year: 2011,
    status: 'ended',
    genres: ['drama'],
    runtime: 55,
    seasons: [Array(10).fill(true), Array(10).fill(true), Array(10).fill(false)],
    resetAt: '2026-07-02T20:00:00.000Z',
    types: { '3x1': 'season_premiere' },
  },
  {
    id: 1421,
    slug: 'the-wire',
    title: 'The Wire',
    year: 2002,
    status: 'ended',
    genres: ['drama'],
    runtime: 60,
    seasons: [Array(13).fill(true)],
    seasonTitles: ['The Streets'],
  },
  {
    id: 60300,
    slug: 'severance',
    title: 'Severance',
    year: 2022,
    status: 'returning series',
    genres: ['drama'],
    runtime: 50,
    seasons: [Array(9).fill(true), Array(10).fill(true)],
  },
];

const at = (season: number, number: number) => new Date(Date.UTC(2026, 8, 1 + season, 20, number)).toISOString();
const episodeId = (sample: Sample, season: number, number: number) => sample.id * 100 + season * 20 + number;
const NOW = Date.parse('2026-09-30T20:00:00.000Z');

function toShow(sample: Sample): CachedShow {
  return {
    id: sample.id,
    slug: sample.slug,
    title: sample.title,
    year: sample.year,
    status: sample.status,
    genres: sample.genres ?? [],
    runtime: sample.runtime,
    rating: 8.4,
    airedEpisodes: sample.seasons.flat().length,
    fetchedAt: NOW,
    complete: true,
  };
}

function toCatalog(sample: Sample): ShowCatalog {
  return {
    id: sample.id,
    fetchedAt: NOW,
    seasons: sample.seasons.map((season, s) => ({
      number: s + 1,
      title: sample.seasonTitles?.[s] ?? `Season ${s + 1}`,
      episodes: season.map((_, e) => ({
        id: episodeId(sample, s + 1, e + 1),
        season: s + 1,
        number: e + 1,
        title: `Episode ${e + 1}`,
        type: sample.types?.[`${s + 1}x${e + 1}`] ?? 'standard',
        firstAired: at(s + 1, e + 1),
        runtime: sample.runtime,
        rating: 8.1,
      })),
    })),
  };
}

/** Watch dates by season and episode id: one a watched episode, the rewatches on the first one. */
function toWatched(sample: Sample) {
  return new Map(sample.seasons.map((season, s) => [
    s + 1,
    new Map(season.flatMap((done, e) => {
      if (!done) return [];
      const extra = s === 0 && e === 0 ? sample.rewatches ?? 0 : 0;
      return [[episodeId(sample, s + 1, e + 1), Array.from({ length: 1 + extra }, () => at(s + 1, e + 1))] as const];
    })),
  ]));
}

function toCollected(sample: Sample): ReadonlyMap<number, ReadonlyMap<number, CollectedItem>> {
  return new Map(sample.seasons.map((season, s) => [
    s + 1,
    new Map(season.flatMap((done, e) => done ? [[e + 1, { at: at(s + 1, e + 1) }] as const] : [])),
  ]));
}

const dropped = new Map([[1390, '2025-12-01T21:40:00.000Z'], [60300, '2025-04-17T17:53:00.000Z']]);

type Options = { kind: 'watched' | 'library'; expanded: boolean; dropped?: boolean };

function toItem(sample: Sample, { kind, expanded, dropped: onDropped }: Options): ProgressItem {
  return toProgressItem({
    kind,
    show: toShow(sample),
    watched: toWatched(sample),
    collected: toCollected(sample),
    resetAt: kind === 'watched' ? sample.resetAt : undefined,
    droppedAt: onDropped ? dropped.get(sample.id) : undefined,
    catalog: expanded ? toCatalog(sample) : undefined,
    includeSpecials: false,
    useLastActivity: false,
    now: NOW,
  });
}

/**
 * Sample progress for the specs and the design page: each tab's items, collapsed (summary counts) or expanded (with
 * the show's catalog). Two shows are dropped.
 */
export const progressFixture = {
  now: NOW,
  watched: (expanded: boolean) => samples.map((sample) => toItem(sample, { kind: 'watched', expanded })),
  library: (expanded: boolean) => samples.map((sample) => toItem(sample, { kind: 'library', expanded })),
  dropped: (expanded: boolean) =>
    samples.filter(({ id }) => dropped.has(id)).map((sample) =>
      toItem(sample, { kind: 'watched', expanded, dropped: true })
    ),
};
