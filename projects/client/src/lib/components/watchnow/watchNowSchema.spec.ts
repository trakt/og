import { describe, expect, it } from 'vitest';
import {
  justWatchLinksSchema,
  watchNowCountriesSchema,
  watchNowOffersSchema,
  watchNowOrderSchema,
  watchNowSourcesSchema,
} from './watchNowSchema.ts';

// Trimmed from apiz's `/movies/fight-club-1999/watchnow/us?extended=streaming_ranks`.
const amazon = {
  source: 'amazon_video',
  link: 'watchnow.trakt.tv/watchnow/228530305',
  uhd: true,
  curreny: 'usd',
  currency: 'usd',
  prices: { rent: '3.99', purchase: '4.99' },
};
const us = {
  free: [],
  subscription: [],
  cable: [],
  purchase: [amazon],
  cinema: [],
  streaming_ranks: { rank: null, delta: null, link: 'https://www.justwatch.com/us/movie/fight-club' },
};

describe('schema: watchNowOffersSchema', () => {
  it('should parse a country’s offers and its JustWatch rank', () => {
    const parsed = watchNowOffersSchema.parse({ us });

    expect(parsed.us?.purchase).toEqual([{
      source: 'amazon_video',
      link: 'watchnow.trakt.tv/watchnow/228530305',
      uhd: true,
      currency: 'usd',
      prices: { rent: '3.99', purchase: '4.99' },
    }]);
    expect(parsed.us?.streaming_ranks?.link).toBe('https://www.justwatch.com/us/movie/fight-club');
  });

  it('should skip a malformed offer instead of failing the country', () => {
    const parsed = watchNowOffersSchema.parse({ us: { ...us, purchase: [{ source: 'broken' }, amazon] } });

    expect(parsed.us?.purchase.map(({ source }) => source)).toEqual(['amazon_video']);
  });

  it('should fill in what an offer or a country leaves out', () => {
    const parsed = watchNowOffersSchema.parse({
      de: { subscription: [{ source: 'netflix', link: 'watchnow.trakt.tv/watchnow/1' }], streaming_ranks: 'x' },
    });

    expect(parsed.de).toEqual({
      free: [],
      subscription: [{ source: 'netflix', link: 'watchnow.trakt.tv/watchnow/1', uhd: false, prices: {} }],
      cable: [],
      purchase: [],
      cinema: [],
      streaming_ranks: null,
    });
  });

  it('should accept an unknown country’s empty object', () => {
    expect(watchNowOffersSchema.parse({})).toEqual({});
  });

  it('should reject a body that isn’t offers by country', () => {
    expect(watchNowOffersSchema.safeParse(null).success).toBe(false);
    expect(watchNowOffersSchema.safeParse([]).success).toBe(false);
    expect(watchNowOffersSchema.safeParse({ us: 'nope' }).success).toBe(false);
  });
});

describe('schema: watchNowOrderSchema', () => {
  it('should keep the ranked keys and drop anything else', () => {
    expect(watchNowOrderSchema.parse(['us-apple_tv', 3, 'us-youtube'])).toEqual(['us-apple_tv', 'us-youtube']);
  });
});

describe('schema: watchNowSourcesSchema', () => {
  it('should parse a country’s sources, with or without a logo and a channel badge', () => {
    const parsed = watchNowSourcesSchema.parse([{
      us: [
        {
          source: 'aande_crime_central_apple_tv_channel',
          name: 'A&E Crime Central (on Apple TV)',
          free: false,
          cinema: false,
          amazon: false,
          link_count: 4103,
          color: '#000000',
          images: {
            logo: 'media.trakt.tv/watchnow/sources/aande_crime_central_apple_tv_channel.webp',
            logo_colorized: null,
            channel: 'media.trakt.tv/watchnow/badges/apple-tv.webp',
          },
        },
        { source: 'plex', name: 'Plex', color: '#e5a00d', images: { logo: null, channel: null } },
        { name: 'no source' },
      ],
    }]);

    expect(parsed[0]?.us?.map(({ source }) => source)).toEqual(['aande_crime_central_apple_tv_channel', 'plex']);
    expect(parsed[0]?.us?.[0]?.images?.channel).toBe('media.trakt.tv/watchnow/badges/apple-tv.webp');
  });
});

describe('schema: watchNowCountriesSchema', () => {
  it('should parse the picker’s countries', () => {
    expect(watchNowCountriesSchema.parse([
      { name: 'Albania', code: 'al', images: { flag: 'media.trakt.tv/watchnow/flags/al.svg' } },
      { name: 'Nowhere' },
    ])).toEqual([{ name: 'Albania', code: 'al', images: { flag: 'media.trakt.tv/watchnow/flags/al.svg' } }]);
  });
});

describe('schema: justWatchLinksSchema', () => {
  it('should parse JustWatch pages by country, and an episode’s empty object', () => {
    expect(justWatchLinksSchema.parse({ de: 'justwatch.com/de/Film/Fight-Club' })).toEqual({
      de: 'justwatch.com/de/Film/Fight-Club',
    });
    expect(justWatchLinksSchema.parse({})).toEqual({});
  });
});
