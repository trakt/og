const YOUTUBE_HOSTS: ReadonlySet<string> = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const VIDEO_ID = /^[\w-]{6,20}$/;

function candidateId(url: URL): string | null | undefined {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1);
  if (!YOUTUBE_HOSTS.has(url.hostname)) return undefined;
  return url.searchParams.get('v') ?? /^\/(?:embed|shorts)\/([^/]+)/.exec(url.pathname)?.at(1);
}

/**
 * The video id in a YouTube link: a youtu.be link, `v=` on youtube.com (how OG's magnific popup read it), or an
 * embed or shorts path. Undefined for anything else, and for an id that isn't one, so it's safe in an embed URL.
 */
export function youtubeId(url: URL): string | undefined {
  const id = candidateId(url);
  return id && VIDEO_ID.test(id) ? id : undefined;
}
