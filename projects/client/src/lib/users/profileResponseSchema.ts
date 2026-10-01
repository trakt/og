import { z } from 'zod/v4';

/** The user fields `toProfileUser` reads, as `/users/:id?extended=full,vip` shapes them. */
export const profileResponseSchema = z.object({
  username: z.string(),
  private: z.boolean(),
  deleted: z.boolean().nullish(),
  name: z.string().nullish(),
  vip: z.boolean().nullish(),
  vip_ep: z.boolean().nullish(),
  vip_og: z.boolean().nullish(),
  vip_years: z.number().nullish(),
  vip_cover_image: z.string().nullish(),
  director: z.boolean().nullish(),
  ids: z.object({ slug: z.string().nullish(), trakt: z.number().nullish() }),
  location: z.string().nullish(),
  gender: z.string().nullish(),
  age: z.number().nullish(),
  about: z.string().nullish(),
  images: z.object({ avatar: z.object({ full: z.string() }) }).nullish(),
});
