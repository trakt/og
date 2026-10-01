import type { CalendarItem } from './calendarDays.ts';
import type { toCalendarPreferences } from './toCalendarPreferences.ts';
import { imageUrl } from '../utils/imageUrl.ts';

type ImageType = ReturnType<typeof toCalendarPreferences>['imageType'];

/** OG uses show artwork; screenshots and missing thumbs fall back to the episode still, then show fanart. */
export function toCalendarImage(item: CalendarItem, type: ImageType) {
  const media = item.type === 'episode' ? item.show : item.movie;
  const still = item.type === 'episode'
    ? item.episode.images?.screenshot?.at(0) ?? media.images?.fanart?.at(0)
    : media.images?.fanart?.at(0);
  const images = media.images;
  const path = type === 'screenshot'
    ? still
    : type === 'thumb'
    ? images?.thumb?.at(0) ?? still
    : type === 'banner'
    ? images?.banner?.at(0)
    : type === 'poster'
    ? images?.poster?.at(0)
    : type === 'none'
    ? undefined
    : images?.fanart?.at(0);
  return {
    image: imageUrl(path, type === 'thumb' || type === 'banner' ? 'medium' : 'thumb'),
    logo: type === 'logo' ? imageUrl(images?.logo?.at(0), 'medium') : undefined,
    logoMode: type === 'logo',
    worded: type === 'thumb' || type === 'banner' || type === 'poster',
    variant: type === 'poster' ? 'poster' as const : type === 'banner' ? 'banner' as const : 'fanart' as const,
    hideTitle: item.type === 'movie' && type === 'poster' && !!path,
    hideSmallTitle: type === 'logo'
      ? !!images?.logo?.at(0)
      : type === 'thumb'
      ? !!images?.thumb?.at(0)
      : (type === 'poster' || type === 'banner') && !!path,
  };
}
