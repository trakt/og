import { redirect } from '@sveltejs/kit';

export function load({ params, url }) {
  redirect(301, `/shows/${encodeURIComponent(params.id)}/seasons/${encodeURIComponent(params.season)}${url.search}`);
}
