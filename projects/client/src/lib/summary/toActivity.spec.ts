import type { ProfileResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import type { SocialRow } from './SocialRow.ts';
import { toActivity } from './toActivity.ts';

const profile = (slug: string, extra: Partial<ProfileResponse> = {}): ProfileResponse => ({
  username: slug,
  private: false,
  deleted: false,
  ids: { slug, trakt: 1 },
  images: { avatar: { full: `https://media.trakt.tv/${slug}.jpg` } },
  ...extra,
});

const social = (slug: string, plays: number | null, rating?: number): SocialRow => ({
  user: { username: slug, ids: { slug } },
  watched: plays === null ? null : { plays, rating: rating === undefined ? null : { rating } },
});

describe('toActivity', () => {
  it('should leave out every tab when nobody watches and nobody is followed', () => {
    expect(toActivity({ watching: [], social: null })).toEqual([]);
  });

  it('should show private members watching now with the placeholder and no link', () => {
    const [tab] = toActivity({
      watching: [profile('sean'), profile('hidden', { private: true, images: null })],
      social: null,
    });
    expect(tab).toMatchObject({ id: 'watching', number: '2', text: ['Watching', 'Now'] });
    expect(tab?.users).toEqual([
      { key: 'sean', name: 'sean', href: '/users/sean', avatar: 'https://media.trakt.tv/sean.jpg' },
      {
        key: 'private-1',
        name: 'hidden',
        avatar: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
      },
    ]);
  });

  it('should list followed watchers by plays and skip the ones who only watchlisted', () => {
    const tabs = toActivity({ watching: [], social: [social('a', 1), social('b', 4, 8), social('c', null)] });
    expect(tabs.map(({ id }) => id)).toEqual(['watched', 'rated']);

    const [watched] = tabs;
    expect(watched).toMatchObject({ number: '2', text: ['People', 'Watched'] });
    expect(watched?.users.map(({ key, plays, rating }) => ({ key, plays, rating }))).toEqual([
      { key: 'b', plays: 4, rating: 8 },
      { key: 'a', plays: 1, rating: undefined },
    ]);
  });

  it("should average the followers' ratings like API, truncating the percentage", () => {
    const rated = toActivity({ watching: [], social: [social('a', 1, 7), social('b', 1, 10), social('c', 1, 9)] })
      .find(({ id }) => id === 'rated');
    expect(rated).toMatchObject({ number: '86', heart: 8, text: ['Rated by', '3 People'] });
    expect(rated?.users.map(({ key }) => key)).toEqual(['b', 'c', 'a']);
  });

  it('should say Person for one', () => {
    const tabs = toActivity({ watching: [], social: [social('a', 2, 6)] });
    expect(tabs.map(({ text }) => text)).toEqual([['Person', 'Watched'], ['Rated by', '1 Person']]);
  });
});
