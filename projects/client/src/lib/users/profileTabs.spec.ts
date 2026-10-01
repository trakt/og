import { describe, expect, it } from 'vitest';
import { profileTabs } from './profileTabs.ts';

const current = (pathname: string) =>
  profileTabs({ slug: 'sean', pathname, isSelf: true }).filter((tab) => tab.current).map((tab) => tab.label);

describe('profileTabs', () => {
  it('should list OG tabs without the cut and deferred ones', () => {
    expect(profileTabs({ slug: 'sean', pathname: '/users/sean', isSelf: true }).map((tab) => tab.label)).toEqual([
      'Profile',
      'History',
      'Progress',
      'Library',
      'Ratings',
      'Lists',
      'Comments',
      'Notes',
      'Network',
    ]);
  });

  it("should leave Progress off someone else's profile", () => {
    const labels = profileTabs({ slug: 'sean', pathname: '/users/sean', isSelf: false }).map((tab) => tab.label);
    expect(labels).not.toContain('Progress');
    expect(labels).toHaveLength(8);
  });

  it('should link each tab under the user', () => {
    const tabs = profileTabs({ slug: 'sean', pathname: '/users/sean', isSelf: true });

    expect(tabs.at(0)?.href).toBe('/users/sean');
    expect(tabs.at(1)?.href).toBe('/users/sean/history');
  });

  it('should mark the tab for the third path segment', () => {
    expect(current('/users/sean')).toEqual(['Profile']);
    expect(current('/users/sean/')).toEqual(['Profile']);
    expect(current('/users/sean/history/movies')).toEqual(['History']);
    expect(current('/users/sean/network/followers')).toEqual(['Network']);
  });

  it('should keep Lists current on watchlist, favorites and recommendations', () => {
    expect(current('/users/sean/watchlist')).toEqual(['Lists']);
    expect(current('/users/sean/favorites/comments')).toEqual(['Lists']);
    expect(current('/users/sean/recommendations')).toEqual(['Lists']);
  });
});
