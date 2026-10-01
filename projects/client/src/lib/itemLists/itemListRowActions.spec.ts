import { describe, expect, it } from 'vitest';
import type { SummaryList } from '../summary/toSummaryList.ts';
import { itemListRowActions } from './itemListRowActions.ts';

const list = (extra: Partial<SummaryList> = {}): SummaryList => ({
  id: 7,
  kind: 'personal',
  href: '/users/sean/lists/heist-night',
  name: 'Heist Night',
  owner: { slug: 'sean', name: 'Sean', href: '/users/sean', avatar: '' },
  posters: [],
  itemCount: 12,
  pills: [],
  ...extra,
});
const origin = 'https://og.trakt.tv';

describe('itemListRowActions', () => {
  it('should give a signed-out viewer progress behind the VIP page and share', () => {
    expect(itemListRowActions({ list: list(), viewer: null, origin })).toEqual({
      progressHref: '/vip/list-progress',
      shareUrl: 'https://og.trakt.tv/users/sean/lists/heist-night',
    });
  });

  it("should give the owner report, edit and delete, and a VIP the list's progress", () => {
    expect(itemListRowActions({ list: list(), viewer: { slug: 'sean', isVip: true }, origin })).toEqual({
      report: {},
      edit: {},
      delete: {},
      progressHref: '/users/sean/progress?list=7',
      shareUrl: 'https://og.trakt.tv/users/sean/lists/heist-night',
    });
  });

  it('should leave progress off official lists and delete off a watchlist', () => {
    expect(itemListRowActions({ list: list({ kind: 'official', href: '/lists/x' }), viewer: null, origin }))
      .toEqual({ shareUrl: 'https://og.trakt.tv/lists/x' });
    expect(itemListRowActions({ list: list({ kind: 'watchlist' }), viewer: { slug: 'sean', isVip: false }, origin }))
      .not.toHaveProperty('delete');
  });
});
