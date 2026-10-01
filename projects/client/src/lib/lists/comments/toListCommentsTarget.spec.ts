import { describe, expect, it } from 'vitest';
import { toListCommentsTarget } from './toListCommentsTarget.ts';

const list = {
  name: 'Best of 2026',
  description: '  My favorites.  ',
  type: 'personal' as const,
  allow_comments: true,
  ids: { trakt: 7, slug: 'best-of-2026' },
  images: {
    posters: [1, 2, 3, 4, 5].map((n) => `media.trakt.tv/images/movies/000/000/00${n}/posters/medium/a.jpg.webp`),
  },
  user: { username: 'Sean', ids: { slug: 'sean' } },
};

describe('toListCommentsTarget', () => {
  it("should title a personal list by name and link to its owner's list page", () => {
    expect(toListCommentsTarget(list)).toMatchObject({
      title: 'Best of 2026',
      fullTitle: 'Best of 2026',
      description: 'My favorites.',
      href: '/users/sean/lists/best-of-2026',
      id: 7,
      allowComments: true,
    });
  });
  it('should quarter the first four posters at thumb size', () => {
    const { posters } = toListCommentsTarget(list);
    expect(posters).toHaveLength(4);
    expect(posters.at(0)?.image).toBe('https://media.trakt.tv/images/movies/000/000/001/posters/thumb/a.jpg.webp');
  });
  it('should link an official list to its official page and leave out a blank description', () => {
    const official = { ...list, type: 'official' as const, description: ' ', allow_comments: false, images: undefined };
    expect(toListCommentsTarget(official)).toEqual({
      title: 'Best of 2026',
      fullTitle: 'Best of 2026',
      href: '/lists/official/best-of-2026',
      id: 7,
      allowComments: false,
      posters: [],
    });
  });
});
