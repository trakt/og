import type { HotReleaseResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { toCalendarItems } from './toCalendarItems.ts';

const show = { title: 'Shogun', ids: { trakt: 1, slug: 'shogun' } };
const episode = { season: 1, number: 2, title: 'Servants of Two Masters', ids: { trakt: 9 } };
const movie = { title: 'Naza', year: 2026, ids: { trakt: 5, slug: 'naza-2026' } };

describe('toCalendarItems', () => {
  it('should map show and movie calendar rows', () => {
    expect(toCalendarItems([{ first_aired: '2026-09-29T21:00:00.000Z', show, episode }] as never)).toEqual([
      { type: 'episode', at: '2026-09-29T21:00:00.000Z', show, episode },
    ]);
    expect(toCalendarItems([{ released: '2026-09-30', movie }] as never)).toEqual([
      { type: 'movie', at: '2026-09-30', movie },
    ]);
  });

  it('should tell the rows of a merged feed apart and drop incomplete ones', () => {
    const rows = [
      { released: '2026-09-30', movie },
      { first_aired: '2026-09-29T21:00:00.000Z', show, episode },
      { first_aired: null, show, episode },
      { released: '2026-09-30', movie: null },
    ] as unknown as HotReleaseResponse[];

    expect(toCalendarItems(rows).map(({ type }) => type)).toEqual(['movie', 'episode']);
  });
});
