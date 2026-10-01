import { redirect } from '@sveltejs/kit';

/** OG's `/user/:id` alias for `/users/:id`. */
export function GET({ params, url }) {
  redirect(301, `/users/${params.path}${url.search}`);
}
