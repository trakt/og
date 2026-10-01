<script lang="ts">
import { page } from '$app/state';
import avatar from '$lib/assets/trakt-logo-red.png';
import Footer from '$lib/components/footer/Footer.svelte';
import Header from '$lib/components/header/Header.svelte';
import AdvancedPage from '$lib/settings/advanced/AdvancedPage.svelte';
import type { AdvancedActions } from '$lib/settings/advanced/AdvancedActions';
import { runAdvancedAction } from '$lib/settings/advanced/runAdvancedAction';
import { toAccountLimits } from '$lib/settings/advanced/toAccountLimits';

// The Advanced tab against a fake viewer, so it renders signed out: a VIP by default, `?free` for a free member and
// `?fail` for refused actions. The actions never reach the API, the overlay or the session: they run through the real
// requests against a fake fetch, so a clear that goes through also empties the header's recent searches for the demo
// viewer (`og-recent-searches:og_red` in localStorage). The header itself reads like any signed-out one.
const vip = !page.url.searchParams.has('free');
const fail = page.url.searchParams.has('fail');
const settings = {
  user: { vip, joined_at: vip ? '2012-02-12T09:00:00.000Z' : '2023-05-04T09:00:00.000Z' },
  limits: vip
    ? {
      list: { count: 100, item_count: 1_000 },
      watchlist: { item_count: 5_000 },
      favorites: { item_count: 100 },
      collection: { item_count: 100_000 },
      notes: { item_count: 1_000 },
      saved_filters: { count: 100 },
    }
    : {
      list: { count: 8, item_count: 1_000 },
      watchlist: { item_count: 1_000 },
      favorites: { item_count: 100 },
      collection: { item_count: 1_000 },
      notes: { item_count: 100 },
      saved_filters: { count: 5 },
    },
};
const data = {
  expired: false,
  vip,
  limits: toAccountLimits({
    settings,
    now: new Date('2026-09-30T12:00:00Z'),
    datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
  }),
};

const user = { slug: 'og_red', firstName: 'OG', avatarUrl: avatar, isVip: vip };
const wait = () => new Promise<void>((done) => setTimeout(done, 600));
const fakeFetch: typeof fetch = async () => {
  await wait();
  return new Response(null, { status: fail ? 500 : 204 });
};
const actions: AdvancedActions = {
  run: (action) => runAdvancedAction({ fetch: fakeFetch, action }),
  resetBrowserData: wait,
  signOut: () => Promise.resolve(),
};
</script>

<Header {user} save={() => Promise.resolve({ saved: true, errors: [] })} />
<main id="content">
  <AdvancedPage {data} {actions} />
</main>
<Footer username={user.slug} />
