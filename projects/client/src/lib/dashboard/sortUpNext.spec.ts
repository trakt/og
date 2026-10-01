import { describe, expect, it } from 'vitest';
import { upNextFixture } from '../progress/upNextFixture.ts';
import type { UpNextEntry } from '../progress/UpNextEntry.ts';
import { sortUpNext } from './sortUpNext.ts';

const entry = (id: number, change: (entry: UpNextEntry) => UpNextEntry): UpNextEntry => {
  const base = upNextFixture.entries.at(0);
  if (!base) throw new Error('no fixture');
  return change({ ...base, show: { ...base.show, ids: { trakt: id, slug: `show-${id}` } } });
};
const ids = (entries: readonly UpNextEntry[]) => entries.map(({ show }) => show.ids.trakt);

const progress = (aired: number, completed: number, minutesLeft: number, plays: number) => (e: UpNextEntry) => ({
  ...e,
  progress: {
    ...e.progress,
    aired,
    completed,
    stats: { play_count: plays, minutes_watched: 0, minutes_left: minutesLeft },
  },
});

describe('sortUpNext', () => {
  const entries = [
    entry(1, progress(10, 5, 250, 5)),
    entry(2, progress(10, 9, 50, 12)),
    entry(3, progress(4, 1, 90, 1)),
  ];

  it('should put the most completed first for ascending, as OG did', () => {
    expect(ids(sortUpNext({ entries, by: 'completed', how: 'asc' }))).toEqual([2, 1, 3]);
    expect(ids(sortUpNext({ entries, by: 'completed', how: 'desc' }))).toEqual([3, 1, 2]);
  });

  it('should put the least time left first', () => {
    expect(ids(sortUpNext({ entries, by: 'time', how: 'asc' }))).toEqual([2, 3, 1]);
  });

  it('should put the most plays first', () => {
    expect(ids(sortUpNext({ entries, by: 'plays', how: 'asc' }))).toEqual([2, 1, 3]);
  });

  it('should put the newest next episode first for release date', () => {
    const aired = (at: string | null) => (e: UpNextEntry) => ({
      ...e,
      progress: {
        ...e.progress,
        next_episode: e.progress.next_episode && { ...e.progress.next_episode, first_aired: at },
      },
    });
    const dated = [
      entry(1, aired('2020-01-01T00:00:00Z')),
      entry(2, aired(null)),
      entry(3, aired('2024-01-01T00:00:00Z')),
    ];

    expect(ids(sortUpNext({ entries: dated, by: 'released', how: 'asc' }))).toEqual([3, 1, 2]);
  });

  it('should put the shortest next episode first for episode runtime, and break ties by the higher id', () => {
    const runtime = (minutes: number) => (e: UpNextEntry) => ({
      ...e,
      progress: {
        ...e.progress,
        next_episode: e.progress.next_episode && { ...e.progress.next_episode, runtime: minutes },
      },
    });
    const timed = [entry(1, runtime(45)), entry(2, runtime(22)), entry(3, runtime(45))];

    expect(ids(sortUpNext({ entries: timed, by: 'runtime', how: 'asc' }))).toEqual([2, 3, 1]);
  });

  it('should put the most voted show first for popularity', () => {
    const votes = (count: number) => (e: UpNextEntry) => ({ ...e, show: { ...e.show, votes: count } });
    const voted = [entry(1, votes(10)), entry(2, votes(900)), entry(3, votes(50))];

    expect(ids(sortUpNext({ entries: voted, by: 'popularity', how: 'asc' }))).toEqual([2, 3, 1]);
  });

  it('should shuffle for random', () => {
    const order = [0.9, 0.1, 0.5];
    const random = () => order.shift() ?? 0;

    expect(ids(sortUpNext({ entries, by: 'random', how: 'asc', random }))).toEqual([2, 3, 1]);
  });

  it('should keep the order for the sorts the worker applies', () => {
    expect(ids(sortUpNext({ entries, by: 'title', how: 'desc' }))).toEqual([1, 2, 3]);
  });
});
