import type { MovieResponse } from '@trakt/api';
import facebook from '../../icons/brands/facebook.svg?raw';
import instagram from '../../icons/brands/instagram.svg?raw';
import twitter from '../../icons/brands/twitter.svg?raw';
import wikipedia from '../../icons/brands/wikipedia-w.svg?raw';
import justwatch from '../../icons/kit/justwatch.svg?raw';
import type { ExternalLink } from './ExternalLink.ts';

type IconLinksParams = {
  social: MovieResponse['social_ids'];
  /** From the watch-now response's streaming rank. */
  justwatch?: string | null;
  /** OG's DuckDuckGo "!wikipedia" search when there's no Wikipedia page: "Breaking Bad 2008 TV Series". */
  search: string;
};

const SOCIALS = [
  { key: 'twitter', label: 'Twitter', icon: twitter, root: 'https://twitter.com/' },
  { key: 'facebook', label: 'Facebook', icon: facebook, root: 'https://facebook.com/' },
  { key: 'instagram', label: 'Instagram', icon: instagram, root: 'https://instagram.com/' },
] as const;

/** The icon half of a summary's external links: JustWatch, Wikipedia, socials. */
export function iconLinks({ social, justwatch: justwatchLink, search }: IconLinksParams): ExternalLink[] {
  const links: (ExternalLink | false)[] = [
    !!justwatchLink && { label: 'JustWatch', href: justwatchLink, icon: justwatch },
    {
      label: 'Wikipedia',
      icon: wikipedia,
      // OG resolved a stored Wikipedia id and fell back to a DuckDuckGo "!wikipedia" search.
      href: social?.wikipedia
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(social.wikipedia)}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(`!wikipedia ${search}`)}`,
    },
    ...SOCIALS.map(({ key, label, icon, root }) => {
      const handle = social?.[key];
      return !!handle && { label, icon, href: `${root}${handle}`, title: `@${handle}` };
    }),
  ];
  return links.filter((link) => link !== false);
}
