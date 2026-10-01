import type { CommentResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import { manageLinks } from './manageLinks.ts';

const NOW = Date.parse('2026-09-29T12:00:00Z');
const comment = (overrides: Partial<Pick<CommentResponse, 'replies' | 'created_at'>> = {}) => ({
  user: { username: 'sean', private: false, deleted: false, ids: { slug: 'sean', trakt: 1 } },
  replies: 0,
  created_at: '2026-09-28T12:00:00Z',
  ...overrides,
});

describe('util: manageLinks', () => {
  it('should give logged-out viewers nothing', () => {
    expect(manageLinks({ comment: comment(), viewer: null, now: NOW })).toEqual({
      block: false,
      report: false,
      edit: false,
      delete: false,
    });
  });

  it("should give members block and report on other people's comments", () => {
    expect(manageLinks({ comment: comment(), viewer: { slug: 'justin' }, now: NOW })).toEqual({
      block: true,
      report: true,
      edit: false,
      delete: false,
    });
  });

  it('should give authors edit and delete', () => {
    expect(manageLinks({ comment: comment(), viewer: { slug: 'sean' }, now: NOW })).toMatchObject({
      edit: true,
      delete: true,
    });
  });

  it('should keep delete off an old comment with replies', () => {
    const old = comment({ replies: 2, created_at: '2026-09-01T12:00:00Z' });
    expect(manageLinks({ comment: old, viewer: { slug: 'sean' }, now: NOW }).delete).toBe(false);
    expect(manageLinks({ comment: { ...old, replies: 0 }, viewer: { slug: 'sean' }, now: NOW }).delete).toBe(true);
    expect(manageLinks({ comment: comment({ replies: 2 }), viewer: { slug: 'sean' }, now: NOW }).delete).toBe(true);
  });

  it('should take report, edit and delete away from commenting-banned members', () => {
    expect(manageLinks({ comment: comment(), viewer: { slug: 'sean', commentingBanned: true }, now: NOW })).toEqual({
      block: true,
      report: false,
      edit: false,
      delete: false,
    });
  });
});
