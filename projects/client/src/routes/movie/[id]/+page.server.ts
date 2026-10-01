import { redirect } from '@sveltejs/kit';

/** OG's legacy `/movie/:id`. `/movies/:id` then redirects again if the id isn't the canonical slug. */
export function load({ params }) {
  redirect(301, `/movies/${encodeURIComponent(params.id)}`);
}
