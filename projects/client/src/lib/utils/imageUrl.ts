export type ImageSize = 'thumb' | 'medium' | 'full';

/**
 * Turns an `extended=images` path (`media.trakt.tv/images/shows/.../posters/medium/abc.jpg.webp`) into an https URL
 * at the given size. The API only ever returns `medium`; `thumb` and `full` exist at the same path.
 */
export function imageUrl(path: string | null | undefined, size: ImageSize): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;

  const sized = trimmed.replace(/\/(thumb|medium|full)\/(?=[^/]+$)/, `/${size}/`);
  return `https://${sized.replace(/^https?:\/\//, '')}`;
}
