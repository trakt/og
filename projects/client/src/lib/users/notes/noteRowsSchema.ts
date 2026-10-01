// FIXME(zod-4): og pins zod 3.25.76, the version @trakt/api 0.6.0 already depends on, so the project has one zod.
// That release ships the v4 API under `zod/v4`, which is what this code uses. When @trakt/api moves to zod 4, bump og's
// zod to the same major and import from `zod` instead. Don't add a second zod install before then. A weekly bump that
// moves zod to 4 arrives as a needs-human draft (deps.yml): decline it until @trakt/api has moved.
import { z } from 'zod/v4';

const image = z.object({ full: z.string().nullish(), medium: z.string().nullish(), thumb: z.string().nullish() });
const media = z.object({
  ids: z.object({ trakt: z.number(), slug: z.string().nullish() }),
  title: z.string().nullish(),
  name: z.string().nullish(),
  year: z.number().nullish(),
  number: z.number().nullish(),
  season: z.number().nullish(),
  rating: z.number().nullish(),
  aired_episodes: z.number().nullish(),
  episode_type: z.string().nullish(),
  images: z.object({
    fanart: z.union([z.string(), z.array(z.string()), image]).nullish(),
    poster: z.union([z.string(), z.array(z.string()), image]).nullish(),
    screenshot: z.union([z.string(), z.array(z.string()), image]).nullish(),
    headshot: z.union([z.string(), z.array(z.string()), image]).nullish(),
  }).nullish(),
});
const user = z.object({
  username: z.string(),
  name: z.string().nullish(),
  ids: z.object({ slug: z.string().nullish() }),
  vip: z.boolean().nullish(),
  vip_ep: z.boolean().nullish(),
  vip_og: z.boolean().nullish(),
  vip_years: z.number().nullish(),
  director: z.boolean().nullish(),
  images: z.object({ avatar: image }).nullish(),
});

/** API's listing wraps each note; @trakt/api 0.6.0 types this endpoint as a bare NoteResponse[]. */
export const noteRowsSchema = z.array(z.object({
  attached_to: z.object({
    type: z.string(),
    watched_at: z.iso.datetime({ offset: true }).nullish(),
    collected_at: z.iso.datetime({ offset: true }).nullish(),
    rated_at: z.iso.datetime({ offset: true }).nullish(),
    rating: z.number().nullish(),
  }),
  type: z.enum(['movie', 'show', 'season', 'episode', 'person']),
  movie: media.nullish(),
  show: media.nullish(),
  season: media.nullish(),
  episode: media.nullish(),
  person: media.nullish(),
  note: z.object({
    id: z.number(),
    notes: z.string().nullish(),
    privacy: z.enum(['public', 'friends', 'private']),
    spoiler: z.boolean().nullish(),
    updated_at: z.iso.datetime({ offset: true }),
    user: user.nullish(),
  }),
}));
