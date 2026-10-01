import { describe, expect, it } from 'vitest';
import { removeHistoryCards } from './removeHistoryCards.ts';
import type { HistoryCard, HistoryDay } from './toHistoryCard.ts';
const card = (key: number, id: number, runtime = 90): HistoryCard => ({
  key,
  id,
  type: 'movie',
  title: 'Movie',
  href: '/movies/movie',
  variant: 'poster',
  watchedAt: '2026-09-29T12:00:00Z',
  watchedDate: 'Sep 29',
  runtime,
});
const days: HistoryDay[] = [
  { key: 'today', date: 'Today', runtime: 180, cards: [card(100, 1), card(101, 2)] },
  { key: 'yesterday', date: 'Yesterday', runtime: 90, cards: [card(102, 1)] },
];
describe('removeHistoryCards', () => {
  it('should remove only the selected history row and update the day runtime', () => {
    const result = removeHistoryCards({ days, item: card(100, 1), play: { id: 100, watchedAt: 'ignored' } });
    expect(result.map((day) => day.cards.map((item) => item.key))).toEqual([[101], [102]]);
    expect(result.at(0)?.runtime).toBe(90);
    expect(days.at(0)?.cards).toHaveLength(2);
  });
  it('should remove every play of the item across days, dropping empty dividers', () => {
    const result = removeHistoryCards({ days, item: card(100, 1) });
    expect(result).toEqual([{ ...days.at(0), runtime: 90, cards: [card(101, 2)] }]);
  });
  it('should keep a different media type with the same numeric id', () => {
    const episode = { ...card(100, 1), type: 'episode' as const };
    const mixed = [{ ...days.at(0), key: 'today', date: 'Today', runtime: 180, cards: [episode, card(101, 1)] }];
    expect(removeHistoryCards({ days: mixed, item: episode }).at(0)?.cards).toEqual([card(101, 1)]);
  });
});
