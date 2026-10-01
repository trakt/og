import { z } from 'zod/v4';
import { episodeNumber } from '../media/episodeTags.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import type { CheckinTarget } from './CheckinTarget.ts';

const images = z.object({
  fanart: z.array(z.string()).nullish(),
  logo: z.array(z.string()).nullish(),
  screenshot: z.array(z.string()).nullish(),
}).nullish();
const media = z.object({ title: z.string().nullish(), year: z.number().nullish(), images });
const rowsSchema = z.array(z.object({
  movie: media.nullish(),
  show: media.nullish(),
  episode: z.object({
    season: z.number(),
    number: z.number(),
    title: z.string().nullish(),
    first_aired: z.string().nullish(),
    images,
  }).nullish(),
}));

type Row = z.infer<typeof rowsSchema>[number];

function toCheckinTarget(type: CheckinTarget['type'], id: number, row: Row): CheckinTarget | null {
  const item = type === 'movie' ? row.movie : row.show;
  if (!item?.title) return null;
  const base = {
    type,
    id,
    topTitle: item.title,
    logo: imageUrl(item.images?.logo?.at(0), 'medium'),
    fanart: imageUrl(item.images?.fanart?.at(0), 'full'),
  };
  if (type === 'movie') return { ...base, fullTitle: item.year ? `${item.title} (${item.year})` : item.title };

  const { episode } = row;
  if (!episode) return null;
  const number = episodeNumber(episode, null);
  return {
    ...base,
    fullTitle: `${item.title} ${number}${episode.title ? ` "${episode.title}"` : ''}`,
    episode: {
      number,
      title: episode.title ?? '',
      firstAired: episode.first_aired ?? undefined,
      screenshot: imageUrl(episode.images?.screenshot?.at(0), 'full'),
    },
  };
}

/** One public lookup gives every modal field for a movie or episode, from a summary button or any card. */
export async function loadCheckinTarget(
  { type, id, fetch }: { type: CheckinTarget['type']; id: number; fetch: (path: string) => Promise<Response> },
): Promise<CheckinTarget | null> {
  const response = await fetch(`/search/trakt/${id}?type=${type}&extended=full,images`);
  if (!response.ok) return null;
  const row = rowsSchema.parse(await response.json()).at(0);
  return row ? toCheckinTarget(type, id, row) : null;
}
