import { z } from 'zod/v4';

const member = z.object({
  person: z.object({
    name: z.string(),
    ids: z.object({ trakt: z.number().int(), slug: z.string() }),
  }),
  character: z.string().nullish().transform((value) => value ?? ''),
  characters: z.array(z.string()).nullish().transform((value) => value ?? []),
  jobs: z.array(z.string()).nullish(),
  episode_count: z.number().int().nullish(),
  images: z.object({ headshot: z.array(z.string()) }).nullish(),
});

/**
 * Any `/people` response (movie, show, season, episode). `guest_stars` is not in the published people contract.
 * Validate the fields the cast strip and the credits pages use; `crew` is keyed by department ("directing").
 */
export const seasonPeopleSchema = z.object({
  cast: z.array(member).nullish(),
  guest_stars: z.array(member).nullish(),
  crew: z.record(z.string(), z.array(member)).nullish(),
});
