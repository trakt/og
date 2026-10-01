import { searchRowsSchema } from './searchRowsSchema.ts';
import { describe, expect, it } from 'vitest';
import { toSearchCard } from './toSearchCard.ts';
import { toSearchListRow } from './toSearchListRow.ts';

const all = {
  typeTag: true,
  posterTitles: true,
  imageType: 'poster',
  now: new Date('2026-09-29T12:00:00Z'),
  order: 'mdy',
} as const;
const episodesTab = { ...all, typeTag: false, posterTitles: false };

const poster = ['media.trakt.tv/images/shows/000/001/390/posters/medium/abc.jpg.webp'];

const hit = (fields: object) => searchRowsSchema.parse([fields]).at(0) ?? { type: 'show' };

const show = hit({
  type: 'show',
  show: {
    title: 'Breaking Bad',
    year: 2008,
    ids: { trakt: 1388, slug: 'breaking-bad' },
    images: { poster },
    rating: 8.9,
    aired_episodes: 62,
    first_aired: '2008-01-21T02:00:00.000Z',
    airs: { timezone: 'America/New_York' },
  },
});

describe('toSearchCard', () => {
  it('should tag a show with its type and year and let the poster stand in for the title', () => {
    expect(toSearchCard(show, all)).toEqual({
      key: 'show-1388',
      type: 'show',
      id: 1388,
      href: '/shows/breaking-bad',
      title: 'Breaking Bad',
      year: 2008,
      image: 'https://media.trakt.tv/images/shows/000/001/390/posters/thumb/abc.jpg.webp',
      logo: undefined,
      logoMode: false,
      tags: [{ text: 'Show' }, { text: '2008', kind: 'generic' }],
      hideTitle: true,
      released: true,
      rating: 8.9,
      airedEpisodes: 62,
      runtime: undefined,
    });
  });

  it('should keep the year in the title only, and show the title, when there is no poster', () => {
    const movie = hit({
      type: 'movie',
      movie: {
        title: 'Soon',
        year: 2027,
        ids: { trakt: 9, slug: 'soon' },
        released: '2027-01-01',
      },
    });
    expect(toSearchCard(movie, all)).toMatchObject({ tags: [{ text: 'Movie' }], hideTitle: false, released: false });
  });

  it('should keep the title on the tabs that show it and drop the type tag on single-type tabs', () => {
    expect(toSearchCard(show, { ...all, typeTag: false, posterTitles: false })).toMatchObject({
      tags: [{ text: '2008', kind: 'generic' }],
      hideTitle: false,
    });
  });

  it('should title an episode with its number and date it in the show zone', () => {
    const episode = hit({
      type: 'episode',
      show: show.show,
      episode: {
        title: 'Pilot',
        season: 1,
        number: 1,
        ids: { trakt: 62085 },
        first_aired: '2008-01-21T02:00:00.000Z',
        rating: 8.2,
      },
    });
    expect(toSearchCard(episode, episodesTab)).toMatchObject({
      key: 'episode-62085',
      season: { show: 1388, number: 1, episode: 1 },
      href: '/shows/breaking-bad/seasons/1/episodes/1',
      title: '1x01 Pilot',
      smallTitle: undefined,
      tags: [{ text: 'Jan 20, 2008' }],
      hideTitle: false,
    });
  });

  it('should include premiere labels in ID mode', () => {
    const episode = hit({ type: 'episode', show: show.show, episode: { ids: { trakt: 3 }, season: 1, number: 1 } });
    expect(toSearchCard(episode, { ...all, premiereTag: true })?.episodeBadge).toEqual({
      label: 'Series Premiere',
      kind: 'series-premiere',
    });
  });

  it('should map a person onto a headshot card', () => {
    const person = hit({
      type: 'person',
      person: { name: 'Aaron Paul', ids: { trakt: 2, slug: 'aaron-paul' } },
    });
    expect(toSearchCard(person, all)).toMatchObject({
      href: '/people/aaron-paul',
      title: 'Aaron Paul',
      image: undefined,
      tags: [{ text: 'Person' }],
    });
  });

  describe('for each image type', () => {
    const art = (kind: string) => [`media.trakt.tv/images/shows/000/001/388/${kind}/medium/a.jpg.webp`];
    const sized = (kind: string, size: string) =>
      `https://media.trakt.tv/images/shows/000/001/388/${kind}/${size}/a.jpg.webp`;
    const images = {
      poster: art('posters'),
      thumb: art('thumbs'),
      fanart: art('fanarts'),
      logo: art('logos'),
      banner: art('banners'),
    };
    const artShow = hit({ type: 'show', show: { ...show.show, images } });
    const bare = hit({ type: 'show', show: { ...show.show, images: { fanart: images.fanart } } });
    const screenshot = ['media.trakt.tv/images/episodes/000/000/001/screenshots/medium/s.jpg.webp'];
    const episode = (showImages: object, episodeImages?: object) =>
      hit({
        type: 'episode',
        show: { ...show.show, images: showImages },
        episode: { title: 'Pilot', season: 1, number: 1, ids: { trakt: 1 }, images: episodeImages },
      });
    const still = 'https://media.trakt.tv/images/episodes/000/000/001/screenshots/thumb/s.jpg.webp';

    it.each(
      [
        ['thumb', sized('thumbs', 'medium')],
        ['banner', sized('banners', 'medium')],
        ['logo', sized('fanarts', 'thumb')],
      ] as const,
    )('should let the %s name a show and keep its year as a tag', (imageType, image) => {
      expect(toSearchCard(artShow, { ...all, imageType })).toMatchObject({
        image,
        hideTitle: true,
        tags: [{ text: 'Show' }, { text: '2008', kind: 'generic' }],
      });
    });

    it.each(['screenshot', 'fanart'] as const)('should title a show over its %s', (imageType) => {
      expect(toSearchCard(artShow, { ...all, imageType })).toMatchObject({
        image: sized('fanarts', 'thumb'),
        logoMode: false,
        hideTitle: false,
        tags: [{ text: 'Show' }],
      });
    });

    it('should put the logo over the dimmed fanart, and keep it dimmed without one', () => {
      expect(toSearchCard(artShow, { ...all, imageType: 'logo' })).toMatchObject({
        logo: sized('logos', 'medium'),
        logoMode: true,
      });
      expect(toSearchCard(bare, { ...all, imageType: 'logo' })).toMatchObject({
        image: sized('fanarts', 'thumb'),
        logoMode: true,
        hideTitle: false,
      });
    });

    it('should fall back from a missing thumb to the fanart, and show the title', () => {
      expect(toSearchCard(bare, { ...all, imageType: 'thumb' })).toMatchObject({
        image: sized('fanarts', 'thumb'),
        hideTitle: false,
      });
    });

    it('should leave a missing banner to the placeholder', () => {
      expect(toSearchCard(bare, { ...all, imageType: 'banner' })).toMatchObject({ image: undefined, hideTitle: false });
    });

    it('should use the episode screenshot, or the show fanart without one', () => {
      expect(toSearchCard(episode(images, { screenshot }), { ...episodesTab, imageType: 'screenshot' }))
        .toMatchObject({ image: still, smallTitle: { text: 'Breaking Bad', href: '/shows/breaking-bad' } });
      expect(toSearchCard(episode(images), { ...episodesTab, imageType: 'screenshot' })?.image)
        .toBe(sized('fanarts', 'thumb'));
    });

    it('should draw the show art on an episode and drop the show name when the art has it', () => {
      expect(toSearchCard(episode(images, { screenshot }), { ...episodesTab, imageType: 'fanart' })).toMatchObject({
        image: sized('fanarts', 'thumb'),
        smallTitle: { text: 'Breaking Bad' },
      });
      expect(toSearchCard(episode(images, { screenshot }), { ...episodesTab, imageType: 'banner' })).toMatchObject({
        image: sized('banners', 'medium'),
        smallTitle: undefined,
        hideTitle: false,
      });
    });

    it('should fall back from a missing show thumb to the episode screenshot', () => {
      expect(toSearchCard(episode({}, { screenshot }), { ...episodesTab, imageType: 'thumb' })).toMatchObject({
        image: still,
        smallTitle: { text: 'Breaking Bad' },
      });
    });

    it('should keep a headshot on a person', () => {
      const headshot = ['media.trakt.tv/images/people/000/000/002/headshots/medium/h.jpg.webp'];
      const person = hit({ type: 'person', person: { name: 'Aaron Paul', ids: { trakt: 2 }, images: { headshot } } });
      expect(toSearchCard(person, { ...all, imageType: 'logo' })).toMatchObject({
        image: 'https://media.trakt.tv/images/people/000/000/002/headshots/thumb/h.jpg.webp',
        logoMode: false,
      });
    });
  });

  it('should skip a list and a hit missing its object', () => {
    expect(toSearchCard(hit({ type: 'list' }), all)).toBeNull();
    expect(toSearchCard(hit({ type: 'movie' }), all)).toBeNull();
  });
});

describe('toSearchListRow', () => {
  const list = (type: 'personal' | 'official', allowComments: boolean) =>
    hit({
      type: 'list',
      list: {
        name: 'Based on a Book',
        type,
        allow_comments: allowComments,
        item_count: 610,
        comment_count: 4,
        likes: 311,
        description: 'Adaptations.',
        ids: { trakt: 3930949, slug: 'based-on-a-book' },
        user: { username: 'preethi', name: '', ids: { slug: 'preethi', trakt: 1 } },
        images: { posters: poster },
      },
    });

  it('should link a personal list under its owner and hide comments when they are off', () => {
    expect(toSearchListRow(list('personal', false))).toEqual({
      key: 'list-3930949',
      id: 3930949,
      kind: 'personal',
      href: '/users/preethi/lists/based-on-a-book',
      name: 'Based on a Book',
      owner: { slug: 'preethi', name: 'preethi', href: '/users/preethi', avatar: undefined },
      posters: [{
        title: 'Based on a Book',
        image: 'https://media.trakt.tv/images/shows/000/001/390/posters/thumb/abc.jpg.webp',
      }],
      itemCount: 610,
      likeCount: 311,
      commentCount: undefined,
      description: 'Adaptations.',
    });
  });

  it('should link an official list to its page, so its comments count reaches the comments page', () => {
    expect(toSearchListRow(list('official', true))).toMatchObject({
      href: '/lists/official/based-on-a-book',
      commentCount: 4,
    });
  });

  it('should skip anything but a list', () => {
    expect(toSearchListRow(show)).toBeNull();
  });
});
