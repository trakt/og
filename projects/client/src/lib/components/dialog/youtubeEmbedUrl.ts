import { youtubeId } from './youtubeId.ts';

/**
 * The autoplaying embed for a YouTube link, the way OG's magnific popup built it. Undefined for anything else, so
 * the caller leaves the plain link alone.
 */
export function youtubeEmbedUrl(url: string): string | undefined {
  const id = URL.canParse(url) ? youtubeId(new URL(url)) : undefined;
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : undefined;
}
