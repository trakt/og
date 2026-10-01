import type { ComponentProps } from 'svelte';
import type FanartCard from '../components/media/FanartCard.svelte';
import { episodeType } from '../components/media/episodeTags.ts';
import type { SearchHit } from './SearchHit.ts';
import type { SearchImageType } from './SearchImageType.ts';
import type { SeasonOf } from '../overlay/createOverlay.svelte.ts';
import { type DateOrder, formatDate } from '../utils/formatDate.ts';
import { imageUrl } from '../utils/imageUrl.ts';

type Tag = NonNullable<ComponentProps<typeof FanartCard>['tags']>[number];

type SearchCard = {
  key: string;
  type: 'movie' | 'show' | 'episode' | 'person';
  id: number;
  href: string;
  title: string;
  /** Lighter after the title, like OG's `item_year_title`. */
  year?: number;
  /** The show over an episode title. OG only drew it when the art doesn't already name the show. */
  smallTitle?: { text: string; href: string };
  image?: string;
  /** The logo over the dimmed fanart, on the logo image type. */
  logo?: string;
  /** The logo image type dims the fanart even when there's no logo to put over it. */
  logoMode: boolean;
  tags: Tag[];
  /** OG hid the text title under worded art on the Shows & Movies, Shows and Movies tabs. */
  hideTitle: boolean;
  /** Out by `now`. Unreleased items get no rating or watch-now icon. */
  released: boolean;
  rating?: number;
  airedEpisodes?: number;
  /** Episode library state is keyed by its show, season and episode number. */
  season?: SeasonOf;
  runtime?: number;
  episodeBadge?: ComponentProps<typeof FanartCard>['episodeBadge'];
};

type SearchCardOptions = {
  /** The type tag. The single-type tabs hide it, since the tab already says it. */
  typeTag: boolean;
  premiereTag?: boolean;
  /** The Shows & Movies, Shows and Movies tabs, where worded art stands in for the title. */
  posterTitles: boolean;
  /** The viewer's search image type. */
  imageType: SearchImageType;
  now: Date;
  order: DateOrder;
};

// OG's season_x_episode: "1x05", or "Special 3" for season 0.
const seasonEpisode = (season: number, number: number) =>
  season === 0 ? `Special ${number}` : `${season}x${String(number).padStart(2, '0')}`;

const released = (date: string | null | undefined, now: Date) => (date ? new Date(date) <= now : false);

type Images = NonNullable<NonNullable<SearchHit['show']>['images']>;

type Art = {
  image?: string;
  logo?: string;
  logoMode: boolean;
  /** A poster, thumb, banner or logo was found: it has the title in it (`has-worded-image`). */
  worded: boolean;
};

/**
 * The art each image type draws . An episode uses its show's art, except its
 * screenshot, which is also the thumb's fallback. `still` is that screenshot, or the fanart for a movie or show.
 */
function toArt(images: Images | null | undefined, still: string | undefined, type: SearchImageType): Art {
  const none = { logoMode: false, worded: false };
  const first = (paths: readonly string[] | null | undefined) => paths?.at(0);
  if (type === 'poster') {
    const image = imageUrl(first(images?.poster), 'thumb');
    return { ...none, image, worded: image !== undefined };
  }
  if (type === 'thumb') {
    const thumb = imageUrl(first(images?.thumb), 'medium');
    return { ...none, image: thumb ?? imageUrl(still, 'thumb'), worded: thumb !== undefined };
  }
  if (type === 'banner') {
    const image = imageUrl(first(images?.banner), 'medium');
    return { ...none, image, worded: image !== undefined };
  }
  if (type === 'screenshot') return { ...none, image: imageUrl(still, 'thumb') };

  const image = imageUrl(first(images?.fanart), 'thumb');
  if (type === 'fanart') return { ...none, image };
  const logo = imageUrl(first(images?.logo), 'medium');
  return { image, logo, logoMode: true, worded: logo !== undefined };
}

/**
 * Maps a `/search` hit onto OG's search card in the viewer's image type. Returns null for a list, which renders as a row, or a hit missing the object its
 * `type` names.
 */
export function toSearchCard(hit: SearchHit, options: SearchCardOptions): SearchCard | null {
  const { typeTag, posterTitles, premiereTag, imageType, now, order } = options;
  const typeTags = (text: string): Tag[] => (typeTag ? [{ text }] : []);
  const { movie, show, episode, person } = hit;

  if (hit.type === 'episode' && episode && show) {
    const { worded, ...art } = toArt(
      show.images,
      episode.images?.screenshot?.at(0) ?? show.images?.fanart?.at(0),
      imageType,
    );
    const timeZone = show.airs?.timezone ?? 'UTC';
    const premiere = premiereTag ? episodeType(episode) : undefined;
    const kind = premiere?.kind;
    const badge = kind === 'series-premiere' || kind === 'season-premiere' || kind === 'mid-season-premiere' ||
        kind === 'mid-season-finale' || kind === 'season-finale' || kind === 'series-finale'
      ? { label: premiere?.text ?? '', kind }
      : undefined;
    const showHref = `/shows/${show.ids.slug ?? show.ids.trakt}`;
    return {
      key: `episode-${episode.ids.trakt}`,
      type: 'episode',
      id: episode.ids.trakt,
      season: { show: show.ids.trakt, number: episode.season, episode: episode.number },
      href: `${showHref}/seasons/${episode.season}/episodes/${episode.number}`,
      title: `${seasonEpisode(episode.season, episode.number)} ${episode.title ?? ''}`.trim(),
      smallTitle: worded ? undefined : { text: show.title, href: showHref },
      ...art,
      tags: [
        ...typeTags('Episode'),
        ...(episode.first_aired ? [{ text: formatDate(episode.first_aired, { timeZone, order }) }] : []),
      ],
      hideTitle: false,
      released: released(episode.first_aired, now),
      rating: episode.rating ?? undefined,
      runtime: episode.runtime ?? show.runtime ?? undefined,
      episodeBadge: badge,
    };
  }

  if (hit.type === 'person' && person) {
    return {
      key: `person-${person.ids.trakt}`,
      type: 'person',
      id: person.ids.trakt,
      href: `/people/${person.ids.slug ?? person.ids.trakt}`,
      title: person.name,
      // OG drew the headshot over every image type.
      image: imageUrl(person.images?.headshot?.at(0), 'thumb'),
      logoMode: false,
      tags: typeTags('Person'),
      hideTitle: false,
      released: false,
    };
  }

  const media = hit.type === 'movie' ? movie : hit.type === 'show' ? show : null;
  if (!media || (hit.type !== 'movie' && hit.type !== 'show')) return null;

  const { worded, ...art } = toArt(media.images, media.images?.fanart?.at(0), imageType);
  const year = media.year ?? undefined;
  return {
    key: `${hit.type}-${media.ids.trakt}`,
    type: hit.type,
    id: media.ids.trakt,
    href: `/${hit.type}s/${media.ids.slug ?? media.ids.trakt}`,
    title: media.title,
    year,
    ...art,
    // Without worded art, the year only shows in the title.
    tags: [
      ...typeTags(hit.type === 'movie' ? 'Movie' : 'Show'),
      ...(worded && year ? [{ text: String(year), kind: 'generic' as const }] : []),
    ],
    hideTitle: posterTitles && worded,
    released: released(hit.type === 'movie' ? movie?.released : show?.first_aired, now),
    rating: media.rating ?? undefined,
    runtime: media.runtime ?? undefined,
    airedEpisodes: hit.type === 'show' ? (show?.aired_episodes ?? undefined) : undefined,
  };
}
