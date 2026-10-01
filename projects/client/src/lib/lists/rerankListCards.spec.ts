import { describe, expect, it } from 'vitest';
import { rerankListCards } from './rerankListCards.ts';

describe('rerankListCards', () => {
  const cards = [{ key: 1, rank: 1 }, { key: 2, rank: 2 }, { key: 3, rank: 3 }];

  it('should renumber the page and keep it in rank order', () => {
    expect(rerankListCards(cards, [3, 1, 2], { by: 'rank', how: 'asc' }))
      .toEqual([{ key: 3, rank: 1 }, { key: 1, rank: 2 }, { key: 2, rank: 3 }]);
    expect(rerankListCards(cards, [3, 1, 2], { by: 'rank', how: 'desc' }))
      .toEqual([{ key: 2, rank: 3 }, { key: 1, rank: 2 }, { key: 3, rank: 1 }]);
  });

  it('should keep the positions of a page in another sort', () => {
    expect(rerankListCards(cards, [3, 1, 2], { by: 'title', how: 'asc' }))
      .toEqual([{ key: 1, rank: 2 }, { key: 2, rank: 3 }, { key: 3, rank: 1 }]);
  });

  it('should keep the rank of a card the order is missing', () => {
    expect(rerankListCards(cards, [2, 1], { by: 'title', how: 'asc' }).at(2)).toEqual({ key: 3, rank: 3 });
  });
});
