import { describe, expect, it } from 'vitest';
import { syncSchema } from './syncSchema.ts';
import { syncsFixture } from './syncsFixture.ts';
import { toSyncRow } from './toSyncRow.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const row = (id: number) => {
  const sync = syncSchema.parse(syncsFixture.find((fixture) => fixture.id === id));
  return toSyncRow({ sync, sources: new Map(), datePreferences });
};

describe('toSyncRow', () => {
  it("should date the row in the viewer's format with the time", () => {
    expect(row(102).date).toBe('Jan 2, 2026 9:07 PM');
    const sync = syncSchema.parse(syncsFixture[2]);
    expect(
      toSyncRow({ sync, sources: new Map(), datePreferences: { ...datePreferences, hour24: true, order: 'dmy' } }).date,
    )
      .toBe('2 Jan 2026 21:07');
  });

  it('should list the added counts per column in OG order', () => {
    expect(row(51).columns).toEqual([
      { section: 'history', added: ['6 movies'], details: [] },
      { section: 'library', added: [], details: [] },
      { section: 'ratings', added: ['3 movies'], details: [] },
      { section: 'watchlist', added: ['2 movies'], details: [] },
    ]);
    expect(row(157).columns.at(0)?.added).toEqual(['64 movies', '231 episodes']);
  });

  it('should put the paused and skipped totals under History, with delimiters', () => {
    expect(row(102).columns.at(0)?.details).toEqual(['2 paused', '4 skipped']);
    expect(row(157).columns.at(0)?.details).toEqual(['5,155 skipped']);
  });

  it("should hide an undone sync's added counts but keep its skipped ones, as OG did", () => {
    const undone = row(119);
    expect(undone.undone).toBe(true);
    expect(undone.columns.at(0)).toEqual({ section: 'history', added: [], details: ['244 skipped'] });
  });

  it('should total what Undo would remove per section', () => {
    expect(row(51).removes).toEqual({ history: 6, paused: 0, library: 0, ratings: 3, watchlist: 2 });
    expect(row(50).removes.ratings).toBe(1224);
  });
});
