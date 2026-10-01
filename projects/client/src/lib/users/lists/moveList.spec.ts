import { describe, expect, it } from 'vitest';
import { toUserListRow } from './toUserListRow.ts';
import { moveList } from './moveList.ts';

const rows = [1, 2, 3].map((id) =>
  toUserListRow({
    name: `List ${id}`,
    privacy: 'public',
    type: 'personal',
    allow_comments: true,
    updated_at: '',
    item_count: 0,
    ids: { trakt: id, slug: `list-${id}` },
    user: { username: 'tester', ids: { slug: 'tester' } },
  }, id)
);
const ids = (rank: number) => moveList({ rows, key: 'list-2', rank }).map(({ id }) => id);
describe('moveList', () => {
  it('should move to first or last and clamp out-of-range positions', () => {
    expect(ids(1)).toEqual([2, 1, 3]);
    expect(ids(3)).toEqual([1, 3, 2]);
    expect(ids(0)).toEqual([2, 1, 3]);
    expect(ids(999)).toEqual([1, 3, 2]);
  });
  it('should renumber every row without mutating the previous order', () => {
    expect(moveList({ rows, key: 'list-3', rank: 1 }).map(({ id, rank }) => [id, rank]))
      .toEqual([[3, 1], [1, 2], [2, 3]]);
    expect(rows.map(({ id, rank }) => [id, rank])).toEqual([[1, 1], [2, 2], [3, 3]]);
  });
  it('should ignore invalid ranks, missing lists and unchanged positions', () => {
    for (const rank of [NaN, Infinity, 1.5, 2]) expect(moveList({ rows, key: 'list-2', rank })).toBe(rows);
    expect(moveList({ rows, key: 'missing', rank: 1 })).toBe(rows);
    expect(moveList({ rows: [], key: 'list-2', rank: 1 })).toEqual([]);
  });
});
