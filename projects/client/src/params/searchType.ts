import { searchTypes } from '../lib/components/header/searchTypes.ts';

/** A `/search/<type>` tab: shows, people, imdb... Shows & Movies is bare `/search`. */
export function match(param: string): boolean {
  return searchTypes.some((type) => type.slug !== '' && type.slug === param);
}
