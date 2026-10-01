import { describe, expect, it } from 'vitest';
import type { ListsQuery } from './ListsQuery.ts';
import type { UserListRow } from './UserListRow.ts';
import { visibleLists } from './visibleLists.ts';

const row = (name: string, rank: number, fields: Partial<UserListRow> = {}): UserListRow => ({
  key: `list-${rank}`,
  id: rank,
  kind: 'personal',
  href: `/users/tester/lists/${rank}`,
  name,
  owner: { slug: 'tester', name: 'Tester', href: '/users/tester', avatar: '', vip: null },
  posters: [],
  itemCount: 0,
  likeCount: 0,
  pills: [],
  shareLink: false,
  isPublic: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
  rank,
  ...fields,
});

const rows = [
  row('The Zebra List', 1, { likeCount: 5, itemCount: 2, updatedAt: '2026-03-01T00:00:00.000Z' }),
  row('An Apple A Day', 2, { likeCount: 9, itemCount: 2, commentCount: 4, description: 'Doctors hate it' }),
  row('Middle', 3, { likeCount: 1, itemCount: 7, updatedAt: '2026-05-01T00:00:00.000Z' }),
];
const names = (query: Partial<ListsQuery>, shuffled?: string[]) =>
  visibleLists(rows, { sort: 'rank', reversed: false, terms: '', ...query }, shuffled).map(({ name }) => name);

describe('visibleLists', () => {
  it('should keep rank order by default and flip it with the arrow', () => {
    expect(names({})).toEqual(['The Zebra List', 'An Apple A Day', 'Middle']);
    expect(names({ reversed: true })).toEqual(['Middle', 'An Apple A Day', 'The Zebra List']);
  });

  it('should sort titles without a leading article', () => {
    expect(names({ sort: 'title' })).toEqual(['An Apple A Day', 'Middle', 'The Zebra List']);
  });

  it('should sort counts and dates newest and biggest first, ties in rank order', () => {
    expect(names({ sort: 'likes' })).toEqual(['An Apple A Day', 'The Zebra List', 'Middle']);
    expect(names({ sort: 'items' })).toEqual(['Middle', 'The Zebra List', 'An Apple A Day']);
    expect(names({ sort: 'comments' })).toEqual(['An Apple A Day', 'The Zebra List', 'Middle']);
    expect(names({ sort: 'updated' })).toEqual(['Middle', 'The Zebra List', 'An Apple A Day']);
  });

  it('should follow the dealt order on Random, and rank order before it is dealt', () => {
    expect(names({ sort: 'random' }, ['list-3', 'list-1', 'list-2'])).toEqual([
      'Middle',
      'The Zebra List',
      'An Apple A Day',
    ]);
    expect(names({ sort: 'random' })).toEqual(['The Zebra List', 'An Apple A Day', 'Middle']);
  });

  it('should search names and descriptions, ignoring case', () => {
    expect(names({ terms: 'ZEBRA' })).toEqual(['The Zebra List']);
    expect(names({ terms: ' doctors ' })).toEqual(['An Apple A Day']);
    expect(names({ terms: '(' })).toEqual([]);
  });
});
