import { describe, expect, it } from 'vitest';
import { hiddenRowsSchema } from './hiddenRowsSchema.ts';
import { toHiddenItem } from './toHiddenItem.ts';
const dates = { order: 'dmy', hour24: true, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
describe('toHiddenItem', () => {
  it('should retain the parent title, season identity, image fallback and viewer date preferences', () => {
    const row = hiddenRowsSchema.parse([{
      type: 'season',
      hidden_at: '2026-09-27T02:00:00Z',
      season: { number: 0, ids: { trakt: 3 } },
      show: { title: 'The Boys', ids: { trakt: 1 }, images: { poster: ['media.trakt.tv/posters/medium/show.jpg'] } },
    }]).at(0);
    expect(row && toHiddenItem(row, dates)).toMatchObject({
      key: 'season:3',
      title: 'Specials',
      parentTitle: 'The Boys',
      sortTitle: 'boys 0',
      image: 'https://media.trakt.tv/posters/thumb/show.jpg',
      date: '26 Sep 2026 19:00',
    });
  });
  it('should support blocked authors without a numeric API id', () => {
    const row = hiddenRowsSchema.parse([{
      type: 'user',
      hidden_at: '2026-09-27T02:00:00Z',
      user: {
        username: 'reader',
        name: '',
        ids: { slug: 'reader' },
        images: { avatar: { full: 'https://example.test/avatar.jpg' } },
      },
    }]).at(0);
    expect(row && toHiddenItem(row, dates)).toMatchObject({
      key: 'user:reader',
      id: 'reader',
      title: 'reader',
      image: 'https://example.test/avatar.jpg',
    });
  });
  it('should omit missing media and reject malformed rows', () => {
    expect(toHiddenItem({ type: 'movie', hidden_at: '2026-09-27T02:00:00Z' }, dates)).toBeNull();
    expect(hiddenRowsSchema.safeParse([{ type: 'show', hidden_at: 'yesterday' }]).success).toBe(false);
  });
});
