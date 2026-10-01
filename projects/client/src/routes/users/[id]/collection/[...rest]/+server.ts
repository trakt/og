import { redirect } from '@sveltejs/kit';

/** OG's deprecated `/users/:id/collection(/...)` rendered the library. */
export function GET({ params, url }) {
  redirect(302, `/users/${params.id}/library${params.rest ? `/${params.rest}` : ''}${url.search}`);
}
