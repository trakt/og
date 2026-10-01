import { redirect } from '@sveltejs/kit';

/** OG's deprecated `/users/:id/recommendations(/:type)` rendered favorites. */
export function GET({ params, url }) {
  redirect(301, `/users/${params.id}/favorites${url.search}`);
}
