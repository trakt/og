// FIXME(zod-4): see noteRowsSchema.ts. og has one zod, the one @trakt/api depends on.
import { z } from 'zod/v4';

/** A list whose malformed rows are skipped, so one bad row never costs the rest. */
const rows = <T extends z.ZodType>(row: T) =>
  z.array(z.unknown()).transform((values) =>
    values.flatMap((value): z.output<T>[] => {
      const parsed = row.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
  );

/** An offer type's list, which a country may leave out. */
const offers = <T extends z.ZodType>(row: T) => rows(row).nullish().transform((values) => values ?? []);

type Prices = { rent?: string | null; purchase?: string | null };

/** One service's offer. The API also sends `curreny`, a misspelled copy of `currency`, which og ignores. */
const offerSchema = z.object({
  source: z.string(),
  link: z.string(),
  uhd: z.boolean().nullish().transform((uhd) => uhd ?? false),
  currency: z.string().nullish(),
  prices: z.object({ rent: z.string().nullish(), purchase: z.string().nullish() }).nullish()
    .transform((prices): Prices => prices ?? {}),
});

/** One country's offers, by type. The JustWatch rank only comes with `?extended=streaming_ranks`. */
const countryOffersSchema = z.object({
  free: offers(offerSchema),
  subscription: offers(offerSchema),
  cable: offers(offerSchema),
  purchase: offers(offerSchema),
  cinema: offers(offerSchema),
  streaming_ranks: z.object({
    rank: z.number().nullish(),
    delta: z.number().nullish(),
    link: z.string().nullish(),
  }).nullish().catch(null),
});

/** `/:item/watchnow` and `/:item/watchnow/:country`: offers by country code. An unknown country is `{}`. */
export const watchNowOffersSchema = z.record(z.string(), countryOffersSchema);

/** `/:item/watchnow/favorites/:country`: the ranked `us-apple_tv` keys, OG's `prioritize_sources`. */
export const watchNowOrderSchema = rows(z.string());

/**
 * `/watchnow/sources/:country`: one `{ [country]: sources }` object in an array. Sources also carry `amazon`,
 * `link_count` and `images.logo_colorized`, which og doesn't read.
 */
export const watchNowSourcesSchema = z.array(z.record(
  z.string(),
  rows(z.object({
    source: z.string(),
    name: z.string(),
    free: z.boolean().nullish(),
    cinema: z.boolean().nullish(),
    color: z.string().nullish(),
    images: z.object({ logo: z.string().nullish(), channel: z.string().nullish() }).nullish(),
  })),
));

/** `/watchnow/countries`: every country JustWatch covers, for the modal's picker. */
export const watchNowCountriesSchema = rows(z.object({
  name: z.string(),
  code: z.string(),
  images: z.object({ flag: z.string().nullish() }).nullish(),
}));

/** `/:item/watchnow/justwatch_links`: the item's JustWatch page by country code, without a scheme. */
export const justWatchLinksSchema = z.record(z.string(), z.string().nullish());

export type WatchNowOffers = z.output<typeof watchNowOffersSchema>;
export type CountryOffers = z.output<typeof countryOffersSchema>;
export type Offer = CountryOffers['free'][number];
export type WatchNowSources = z.output<typeof watchNowSourcesSchema>;
export type WatchNowCountry = z.output<typeof watchNowCountriesSchema>[number];
