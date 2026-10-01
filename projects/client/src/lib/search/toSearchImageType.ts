import { z } from 'zod/v4';

// The choices on OG's profile form. The API sends null to a member who isn't VIP or
// grandfathered, so og doesn't check that again.
const schema = z.object({
  browsing: z.object({
    search: z.object({
      image_type: z.enum(['poster', 'thumb', 'screenshot', 'fanart', 'logo', 'banner']).nullish().catch(null),
    }).nullish(),
  }).nullish(),
});

type SearchImageTypeParams = {
  /** The layout's `/users/settings`, null when signed out. */
  settings: unknown;
  /** The search tab. */
  slug: string;
};

/**
 * The card art on the search grid: the viewer's "Search image type", poster by default.
 * People always get posters. Lists and users have their own rows and cards, so it doesn't reach them.
 */
export function toSearchImageType({ settings, slug }: SearchImageTypeParams) {
  if (slug === 'people') return 'poster';
  const parsed = schema.safeParse(settings);
  return (parsed.success ? parsed.data.browsing?.search?.image_type : null) ?? 'poster';
}
