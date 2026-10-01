import type { PersonResponse } from '@trakt/api';
import type { ExternalLink } from '../components/summary/ExternalLink.ts';
import { iconLinks } from '../components/summary/iconLinks.ts';

// OG fell back to web search when the person had no ids.
const imdbLink = ({ ids, name }: PersonResponse) =>
  ids.imdb
    ? `https://www.imdb.com/name/${ids.imdb}`
    : `https://www.imdb.com/find?${new URLSearchParams({ q: name, s: 'nm' })}`;

/** A person's external links. */
export function personLinks(person: PersonResponse): ExternalLink[] {
  const links: (ExternalLink | false)[] = [
    !!person.homepage && { label: 'Official Site', href: person.homepage },
    { label: 'IMDB', href: imdbLink(person) },
    !!person.ids.tmdb && { label: 'TMDB', href: `https://www.themoviedb.org/person/${person.ids.tmdb}` },
    ...iconLinks({ social: person.social_ids, search: person.name }),
  ];
  return links.filter((link) => link !== false);
}
