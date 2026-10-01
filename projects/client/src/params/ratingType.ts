import { ratingTypes } from '../lib/users/ratings/ratingTypes.ts';
/** Ratings media types outrank the route's fallback rest segments. */
export const match = (param: string) => Object.hasOwn(ratingTypes, param);
