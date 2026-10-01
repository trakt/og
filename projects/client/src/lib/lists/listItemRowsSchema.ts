// FIXME(zod-4): see noteRowsSchema.ts. og uses the zod @trakt/api depends on, through its `zod/v4` API.
import { z } from 'zod/v4';

const images = z.object({
  poster: z.array(z.string()).nullish(),
  fanart: z.array(z.string()).nullish(),
  screenshot: z.array(z.string()).nullish(),
  headshot: z.array(z.string()).nullish(),
}).nullish();

const stats = {
  rating: z.number().nullish(),
  votes: z.number().nullish(),
};

const movie = z.object({
  title: z.string(),
  year: z.number().nullish(),
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  runtime: z.number().nullish(),
  released: z.string().nullish(),
  images,
  ...stats,
});

const show = z.object({
  title: z.string(),
  year: z.number().nullish(),
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  first_aired: z.string().nullish(),
  /** Per episode: an episode without its own runtime takes it. */
  runtime: z.number().nullish(),
  total_runtime: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  genres: z.array(z.string()).nullish(),
  images,
  ...stats,
});

const season = z.object({
  title: z.string().nullish(),
  number: z.number(),
  ids: z.object({ trakt: z.number() }),
  first_aired: z.string().nullish(),
  total_runtime: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  images,
  ...stats,
});

const episode = z.object({
  title: z.string().nullish(),
  season: z.number(),
  number: z.number(),
  number_abs: z.number().nullish(),
  episode_type: z.string().nullish(),
  ids: z.object({ trakt: z.number() }),
  runtime: z.number().nullish(),
  first_aired: z.string().nullish(),
  images,
  ...stats,
});

const person = z.object({
  name: z.string(),
  ids: z.object({ trakt: z.number(), slug: z.string() }),
  images,
});

const listed = {
  rank: z.number(),
  id: z.number(),
  listed_at: z.string(),
  notes: z.string().nullish(),
};

const row = z.discriminatedUnion('type', [
  z.object({ type: z.literal('movie'), movie, ...listed }),
  z.object({ type: z.literal('show'), show, ...listed }),
  z.object({ type: z.literal('season'), show, season, ...listed }),
  z.object({ type: z.literal('episode'), show, episode, ...listed }),
  z.object({ type: z.literal('person'), person, ...listed }),
]);

export type ListItemRow = z.infer<typeof row>;

/**
 * Items on a list (`/users/:id/lists/:list/items/:type/:sort_by/:sort_how?extended=full,images`). `@trakt/api` types
 * them without people and without `notes`, so they're parsed here. A row whose item is gone or malformed is skipped,
 * like OG's `next if item.listable.blank?`, instead of failing the page.
 */
export const listItemRowsSchema = z.array(z.unknown()).transform((rows) =>
  rows.flatMap((value): ListItemRow[] => {
    const parsed = row.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  })
);
