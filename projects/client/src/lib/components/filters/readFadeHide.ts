import type { Cookies } from '@sveltejs/kit';
import { parseFadeHide } from './fadeHide.ts';

/** Page-local preferences; an explicit URL list overrides the cookie, including an empty list. */
export function readFadeHide({ cookies, search, scope }: {
  cookies?: Pick<Cookies, 'get'>;
  search?: URLSearchParams;
  scope: string;
}) {
  return {
    fade: parseFadeHide(search?.get('fade') ?? cookies?.get(`filter-fade-${scope}`)),
    hide: parseFadeHide(search?.get('hide') ?? cookies?.get(`filter-hide-${scope}`)),
  };
}
