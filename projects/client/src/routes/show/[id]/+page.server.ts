import { redirect } from '@sveltejs/kit';

/** OG's legacy `/show/:id`. `/shows/:id` then redirects again if the id isn't the canonical slug. */
export function load({ params }) {
  redirect(301, `/shows/${encodeURIComponent(params.id)}`);
}
