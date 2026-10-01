import type { PersonResponse } from '@trakt/api';
import { personLinks } from '../people/personLinks.ts';
import { imageUrl } from '../utils/imageUrl.ts';
import type { SubpageFrameMedia } from './SubpageFrameMedia.ts';

/**
 * A person subpage's header and sidebar: the person's own fanart
 * (`item_top_fanart`), the headshot as the poster and the person's external links.
 */
export function toPersonSubpageMedia(person: PersonResponse): SubpageFrameMedia {
  return {
    item: { title: person.name },
    title: person.name,
    href: `/people/${person.ids.slug}`,
    parents: [],
    fanart: imageUrl(person.images?.fanart?.at(0), 'full'),
    poster: imageUrl(person.images?.headshot?.at(0), 'medium'),
    links: personLinks(person),
  };
}
