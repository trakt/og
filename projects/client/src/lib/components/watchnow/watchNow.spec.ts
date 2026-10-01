import { describe, expect, it } from 'vitest';
import {
  countryCounts,
  favoriteSlugs,
  type Offers,
  type Source,
  toSourceMap,
  toWatchNowButton,
  toWatchNowSections,
} from './watchNow.ts';
import type { Offer } from './watchNowSchema.ts';

const offer = (source: string, extra: Partial<Offer> = {}): Offer => ({
  source,
  link: `watchnow.trakt.tv/watchnow/${source}`,
  uhd: false,
  currency: 'usd',
  prices: { rent: null, purchase: null },
  ...extra,
});

const offers = (
  rows: Partial<Record<'free' | 'subscription' | 'cable' | 'purchase' | 'cinema', string[]>>,
): Offers => ({
  free: (rows.free ?? []).map((slug) => offer(slug)),
  subscription: (rows.subscription ?? []).map((slug) => offer(slug)),
  cable: (rows.cable ?? []).map((slug) => offer(slug)),
  purchase: (rows.purchase ?? []).map((slug) => offer(slug, { prices: { rent: '3.99', purchase: '19.99' } })),
  cinema: (rows.cinema ?? []).map((slug) => offer(slug)),
});

const sources = new Map<string, Source>(
  ['netflix', 'apple_tv', 'amazon_video', 'youtube', 'starz_amazon_channel', 'amc_theatres'].map((slug) => [
    slug,
    { name: slug === 'starz_amazon_channel' ? 'Starz (on Amazon)' : slug.toUpperCase(), color: '#000' },
  ]),
);

const button = (overrides: Partial<Parameters<typeof toWatchNowButton>[0]> = {}) =>
  toWatchNowButton({
    path: '/movies/fight-club-1999',
    offers: offers({ subscription: ['netflix'], purchase: ['amazon_video', 'apple_tv', 'youtube'] }),
    order: ['us-apple_tv', 'us-amazon_video', 'us-youtube', 'us-netflix'],
    sources,
    country: 'us',
    favorites: [],
    onlyFavorites: false,
    isVip: false,
    ...overrides,
  });

describe('toWatchNowButton', () => {
  it('shows the first two ranked services and counts each service once', () => {
    const result = button();
    expect(result.tiles.map(({ slug }) => slug)).toEqual(['apple_tv', 'amazon_video']);
    expect(result.tiles[0]?.href).toBe('https://watchnow.trakt.tv/watchnow/apple_tv');
    expect(result).toMatchObject({ count: 4, favorites: 0, cinemaOnly: false, hidden: false });
  });

  it('puts the viewer’s favorites first, bare slugs meaning their own country', () => {
    const result = button({ favorites: ['us-youtube', 'netflix', 'gb-apple_tv', 'us-hulu'] });
    expect(result.tiles.map(({ slug }) => slug)).toEqual(['youtube', 'netflix']);
    expect(result.favorites).toBe(2);
  });

  it('skips a service the sources list doesn’t name, among the first four', () => {
    const result = button({ order: ['us-unknown', 'us-youtube', 'us-apple_tv'] });
    expect(result.tiles.map(({ slug }) => slug)).toEqual(['youtube', 'apple_tv']);
  });

  it('falls back to section order without a ranking', () => {
    expect(button({ order: null }).tiles.map(({ slug }) => slug)).toEqual(['netflix', 'amazon_video']);
  });

  it('is cinema-only when every service sells tickets', () => {
    expect(button({ offers: offers({ cinema: ['amc_theatres'] }) }).cinemaOnly).toBe(true);
    expect(button({ offers: offers({ cinema: ['amc_theatres'], free: ['youtube'] }) }).cinemaOnly).toBe(false);
  });

  it('hides for a VIP who only wants favorites when none has it', () => {
    expect(button({ isVip: true, onlyFavorites: true }).hidden).toBe(true);
    expect(button({ isVip: true, onlyFavorites: true, favorites: ['us-netflix'] }).hidden).toBe(false);
    expect(button({ onlyFavorites: true }).hidden).toBe(false);
  });

  it('has nothing to show with no offers', () => {
    expect(button({ offers: null, order: null })).toMatchObject({ tiles: [], count: 0 });
  });
});

describe('toWatchNowSections', () => {
  it('lists favorites first, then each non-empty offer type without repeating them', () => {
    const sections = toWatchNowSections({
      offers: offers({
        subscription: ['netflix', 'starz_amazon_channel'],
        purchase: ['apple_tv', 'apple_tv', 'youtube'],
      }),
      sources,
      favorites: ['youtube'],
    });
    expect(sections.map(({ title, links }) => [title, links.map(({ slug }) => slug)])).toEqual([
      ['Your Favorites', ['youtube']],
      ['subscription', ['netflix', 'starz_amazon_channel']],
      ['purchase', ['apple_tv']],
    ]);
    expect(sections[1]?.links.map(({ price }) => price)).toEqual([
      ['Included with', 'Subscription'],
      ['with Starz Subscription'],
    ]);
    expect(sections[2]?.links[0]?.price).toEqual(['Rent: $3.99', 'Buy: $19.99']);
  });

  it('is empty when nothing is available', () => {
    expect(toWatchNowSections({ offers: undefined, sources, favorites: [] })).toEqual([]);
  });
});

describe('helpers', () => {
  it('counts distinct services per country', () => {
    expect(countryCounts({ us: offers({ free: ['youtube'], purchase: ['youtube', 'apple_tv'] }), gb: offers({}) }))
      .toEqual({ us: 2, gb: 0 });
  });

  it('keeps favorites for the picked country', () => {
    expect(favoriteSlugs(['us-netflix', 'hulu', 'gb-now_tv'], 'us', 'us')).toEqual(['netflix', 'hulu']);
    expect(favoriteSlugs(['us-netflix', 'hulu', 'gb-now_tv'], 'gb', 'us')).toEqual(['now_tv']);
  });

  it('maps a country’s sources with https images', () => {
    const map = toSourceMap([
      {
        us: [{
          source: 'netflix',
          name: 'Netflix',
          free: false,
          cinema: false,
          color: '#e50914',
          images: { logo: 'media.trakt.tv/watchnow/sources/netflix.webp', channel: null },
        }],
      },
    ], 'us');
    expect(map.get('netflix')).toEqual({
      name: 'Netflix',
      color: '#e50914',
      logo: 'https://media.trakt.tv/watchnow/sources/netflix.webp',
    });
  });
});
