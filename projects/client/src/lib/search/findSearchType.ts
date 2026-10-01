import { searchTypes } from '../components/header/searchTypes.ts';
import type { SearchType } from './SearchType.ts';

/** The tab for a path segment. Left out, it's Shows & Movies. */
export const findSearchType = (slug = ''): SearchType | undefined => searchTypes.find((type) => type.slug === slug);
