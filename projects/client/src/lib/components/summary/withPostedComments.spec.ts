import type { CommentResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import type { CommentTab } from '../../summary/sectionsClient.ts';
import { withPostedComments } from './withPostedComments.ts';

const comment = (id: number): CommentResponse => ({
  id,
  parent_id: 0,
  created_at: '2026-09-30T10:00:00.000Z',
  updated_at: '2026-09-30T10:00:00.000Z',
  comment: 'Five words or more here',
  spoiler: false,
  review: false,
  replies: 0,
  likes: 0,
  user_stats: { rating: null, play_count: 0, completed_count: 0 },
  user: { username: 'sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 1 } },
});
const tab = (id: CommentTab['id'], ...ids: number[]): CommentTab => ({ id, label: id, comments: ids.map(comment) });
const shape = (tabs: readonly CommentTab[]) => tabs.map((t) => [t.id, t.comments.map(({ id }) => id)]);

describe('withPostedComments', () => {
  it('should leave the tabs alone before anything is posted', () => {
    const tabs = [tab('likes', 1)];
    expect(withPostedComments(tabs, [])).toBe(tabs);
  });

  it('should put posted comments on top of Recent', () => {
    expect(shape(withPostedComments([tab('likes', 1), tab('recent', 2), tab('me', 3)], [comment(9)])))
      .toEqual([['likes', [1]], ['recent', [9, 2]], ['me', [3]]]);
  });

  it('should add Recent after Likes, or first without Likes', () => {
    expect(shape(withPostedComments([tab('likes', 1), tab('me', 3)], [comment(9)])))
      .toEqual([['likes', [1]], ['recent', [9]], ['me', [3]]]);
    expect(shape(withPostedComments([tab('me', 3)], [comment(9)]))).toEqual([['recent', [9]], ['me', [3]]]);
  });
});
