import { describe, expect, it } from 'vitest';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { type ListItemRow, listItemRowsSchema } from './listItemRowsSchema.ts';
import { toListItemCard } from './toListItemCard.ts';

const datePreferences: DatePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 };
const listed = { rank: 3, id: 900, listed_at: '2026-01-02T15:04:00.000Z', notes: null };
const show = {
  title: 'The Boys',
  ids: { trakt: 1, slug: 'the-boys' },
  first_aired: '2019-07-26T07:00:00.000Z',
  total_runtime: 1800,
  aired_episodes: 32,
  genres: ['drama'],
  rating: 8.4,
  votes: 25_000,
  images: { poster: ['media.trakt.tv/images/shows/1/posters/medium/a.jpg.webp'], fanart: [] },
};
const movie = {
  title: 'Heat',
  ids: { trakt: 2, slug: 'heat-1995' },
  released: '1995-12-15',
  runtime: 170,
  rating: 8.19,
  votes: 1,
  images: { poster: [] },
};
const [movieRow, seasonRow, episodeRow, personRow] = listItemRowsSchema.parse([
  { type: 'movie', movie, ...listed, notes: '  Watch it :fire:  ' },
  { type: 'season', show, season: { number: 2, title: 'Season 2', ids: { trakt: 3 }, total_runtime: 480 }, ...listed },
  {
    type: 'episode',
    show,
    episode: {
      season: 1,
      number: 1,
      title: 'The Name of the Game',
      ids: { trakt: 4 },
      episode_type: 'series_premiere',
    },
    ...listed,
  },
  { type: 'person', person: { name: 'Al Pacino', ids: { trakt: 5, slug: 'al-pacino' } }, ...listed },
]) as ListItemRow[];

const card = (row: ListItemRow | undefined, sortBy: string) => {
  if (!row) throw new Error('missing row');
  return toListItemCard(row, { sortBy, datePreferences });
};

describe('toListItemCard', () => {
  it('should map a movie with its sorted line first and trimmed notes', () => {
    expect(card(movieRow, 'released')).toMatchObject({
      key: 900,
      type: 'movie',
      id: 2,
      href: '/movies/heat-1995',
      rank: 3,
      notes: 'Watch it :fire:',
      lines: [{ text: 'Dec 15, 1995', href: '/movies/heat-1995' }, { text: ' ' }],
    });
  });

  it('should show the Trakt rating line for the rating sorts', () => {
    expect(card(movieRow, 'percentage').lines.at(0)).toEqual({ rating: 8.19, votes: 1, href: '/movies/heat-1995' });
  });

  it('should put the show first on a season, then the sorted line', () => {
    expect(card(seasonRow, 'runtime')).toMatchObject({
      title: 'Season 2',
      href: '/shows/the-boys/seasons/2',
      seasonOf: { show: 1, number: 2 },
      lines: [{ text: 'The Boys', href: '/shows/the-boys' }, { text: '8h' }],
    });
  });

  it('should number an episode, badge a premiere and show the added date', () => {
    expect(card(episodeRow, 'added')).toMatchObject({
      number: '1x01',
      episodeBadge: { label: 'Series Premiere' },
      lines: [{ text: 'The Boys' }, { text: 'Jan 2, 2026 3:04 PM' }],
      noteTitle: { title: '1x01 The Name of the Game', show: 'The Boys' },
    });
  });

  it('should leave the lines blank for sorts with nothing to show', () => {
    expect(card(movieRow, 'imdb_rating').lines).toEqual([
      { text: ' ', href: '/movies/heat-1995' },
      { text: ' ', href: '/movies/heat-1995' },
    ]);
    expect(card(personRow, 'percentage')).toMatchObject({ href: '/people/al-pacino', title: 'Al Pacino' });
    expect(card(personRow, 'percentage').lines.at(0)).toEqual({ text: ' ', href: '/people/al-pacino' });
  });

  it('should skip rows the schema cannot read', () => {
    expect(listItemRowsSchema.parse([{ type: 'movie', ...listed }, { type: 'person', person: movie, ...listed }]))
      .toEqual([]);
  });
});
