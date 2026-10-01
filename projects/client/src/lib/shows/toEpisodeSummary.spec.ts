import { describe, expect, it } from 'vitest';
import { toEpisodeSummary } from './toEpisodeSummary.ts';
const episode = {
  season: 1,
  number: 2,
  title: 'Second',
  ids: { trakt: 102 },
  first_aired: '2008-01-28T02:00:00Z',
  number_abs: 2,
};
const member = {
  person: { name: 'Vince Gilligan', ids: { trakt: 1, slug: 'vince-gilligan' } },
  jobs: ['Director'],
  job: 'Director',
};
const base: Parameters<typeof toEpisodeSummary>[0] = {
  show: {
    title: 'Breaking Bad',
    ids: { trakt: 1388, slug: 'breaking-bad', imdb: 'tt0903747', tmdb: 1396 },
    runtime: 45,
    network: 'AMC',
    country: 'us',
    languages: ['en'],
    genres: ['crime'],
  },
  season: { number: 1, ids: { trakt: 3950 } },
  episode,
  episodes: [episode, { season: 1, number: 1, title: 'Pilot', ids: { trakt: 101 } }],
  seasons: [{ number: 0, episodes: [{ season: 0, number: 1, ids: { trakt: 99 } }] }, {
    number: 2,
    episodes: [{ season: 2, number: 1, title: 'Third', ids: { trakt: 103 } }],
  }, { number: 1, episodes: [episode, { season: 1, number: 1, title: 'Pilot', ids: { trakt: 101 } }] }],
  people: { cast: [], crew: { directing: [member], writing: [{ ...member, jobs: ['Writer', 'Story'] }] } },
  regulars: { cast: [], guest_stars: [] },
  ratings: { rating: 8.2, votes: 1600 },
  stats: { watchers: 10, plays: 20, collectors: 2, comments: 3, lists: 4, votes: 1600 },
  videos: [],
  datePreferences: { order: 'dmy', hour24: true, timeZone: 'America/Los_Angeles', weekStartDay: 1 },
  now: new Date('2026-01-01T00:00:00Z'),
  isVip: false,
  episodeTypeTags: true,
  earlyRatings: false,
  otherSiteRatings: true,
};
describe('toEpisodeSummary', () => {
  it('should map episode facts with viewer time zone and shared crew notes', () => {
    const view = toEpisodeSummary(base);
    expect(view.fullTitle).toBe('Breaking Bad 1x02 Second');
    expect(view.facts.aired).toEqual({ label: 'Aired', date: '27 January 2008 18:00' });
    expect(view.facts.runtime).toBe('45m');
    expect(view.facts.directors.at(0)?.href).toBe('/people/vince-gilligan');
    expect(view.facts.writers.at(0)?.note).toBe('story');
    expect(view.counts.map(({ label }) => label)).not.toContain('favorited');
  });
  it('should navigate across seasons in number order with accessible episode names', () => {
    const view = toEpisodeSummary(base);
    expect(view.previous).toEqual({
      href: '/shows/breaking-bad/seasons/1/episodes/1',
      label: 'Previous episode: 1x01 Pilot',
    });
    expect(view.next?.href).toBe('/shows/breaking-bad/seasons/2/episodes/1');
    expect(view.episodeLinks.map(({ text }) => text)).toEqual(['1', '2']);
    expect(view.episodeLinks.find(({ selected }) => selected)?.text).toBe('2');
  });
  it('should omit first and last neighbours and keep specials separate', () => {
    expect(toEpisodeSummary({ ...base, episode: { ...episode, number: 1 } }).previous).toBeUndefined();
    expect(toEpisodeSummary({ ...base, episode: { ...episode, season: 2, number: 1 } }).next).toBeUndefined();
    const special = toEpisodeSummary({ ...base, episode: { ...episode, season: 0, number: 1 } });
    expect(special.previous).toBeUndefined();
    expect(special.next).toBeUndefined();
  });
  it('should handle anime absolute numbers, future ratings and hidden tags', () => {
    const view = toEpisodeSummary({
      ...base,
      show: { ...base.show, genres: ['anime'] },
      episode: { ...episode, first_aired: '2027-01-01T00:00:00Z' },
      episodeTypeTags: false,
    });
    expect(view.number).toBe('1x02 (2)');
    expect(view.rating).toBeUndefined();
    expect(view.type).toBeUndefined();
    expect(view.facts.aired?.label).toBe('Airs');
    expect(toEpisodeSummary({ ...base, episode: { ...episode, first_aired: null }, earlyRatings: true }).rating?.value)
      .toBe(8.2);
  });
  it('should omit actor episode counts and duplicate original titles', () => {
    const cast = {
      person: { name: 'Actor', ids: { trakt: 1, slug: 'actor' } },
      characters: ['Guest'],
      episode_count: 3,
      character: '',
    };
    const view = toEpisodeSummary({
      ...base,
      regulars: { cast: [cast] },
      people: { cast: [cast] },
      episode: { ...episode, original_title: 'Second' },
    });
    expect(view.cast.at(0)?.episodes).toBeUndefined();
    expect(view.guestStars.at(0)?.episodes).toBeUndefined();
    expect(view.facts.originalTitle).toBeUndefined();
  });
});
