import { z } from 'zod/v4';
import { api } from '../api/api.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { FavoriteTarget } from './FavoriteTarget.ts';

const summarySchema = z.object({
  title: z.string(),
  year: z.number().nullish(),
  images: z.object({ fanart: z.array(z.string()).nullish() }).nullish(),
});

/** Poster controls only know the title. Read the public summary for the notes title band, without a token. */
export async function loadFavoriteTarget(target: FavoriteTarget): Promise<FavoriteTarget> {
  if (target.year !== undefined) return target;
  try {
    const client = api();
    const query = { params: { id: String(target.id) }, query: { extended: 'full,images' as const } };
    const response = target.type === 'movie' ? await client.movies.summary(query) : await client.shows.summary(query);
    if (response.status !== 200) return target;
    // Native contract types are trusted; an API response is validated at the boundary.
    const body = response.headers.has('X-Runtime') ? summarySchema.parse(response.body) : response.body;
    return { ...target, title: body.title, year: body.year, fanart: imageUrl(body.images?.fanart?.at(0), 'thumb') };
  } catch {
    return target;
  }
}
