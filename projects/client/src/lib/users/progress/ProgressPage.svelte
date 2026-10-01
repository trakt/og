<!--
  `/users/:id/progress(/:type)(/:sort_by/:sort_how)`, your own progress, computed in the browser. The overlay has
  every watched and collected episode, the reset and drop dates, the watchlist and the hidden shows; the show cache
  adds each show's aired episodes, status, runtime and poster. A summary is read only when it's missing or older than
  12 hours, in bulk where many are (`loadProgressShows`), and the page's posters first. Opening a row's seasons reads
  that show's catalog once, which makes its counts exact and adds the next episode. Watches, drops, hides and
  rewatches patch the overlay, so the rows recompute as they save.
-->
<script lang="ts">
import { untrack } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { apiQueue } from '$lib/api/apiQueue';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import { toast } from '$lib/components/toast/toast.svelte';
import { fetchListItemRefs } from '$lib/lists/fetchListItemRefs';
import { overlay } from '$lib/overlay/overlay';
import type { ApiGet } from '$lib/overlay/sliceSources';
import type { CachedShow } from '$lib/shows/cache/CachedShow';
import { loadCachedShows } from '$lib/shows/cache/loadCachedShows';
import { loadShowCatalog } from '$lib/shows/cache/loadShowCatalog';
import { showCache } from '$lib/shows/cache/showCache';
import type { ShowCatalog } from '$lib/shows/cache/ShowCatalog';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { loadProgress } from './loadProgress.ts';
import { loadProgressShows } from './loadProgressShows.ts';
import ProgressList from './ProgressList.svelte';
import { progressShowIds } from './progressShowIds.ts';
import { toProgressItems } from './toProgressItems.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadProgress>> & { profile: ProfileUser; user: HeaderUser | null };
};

const { data }: Props = $props();

const now = Date.now();
const fetch = () => authenticatedFetch({ manager: userManager() });
// Your own reads, with the token, through the shared queue.
const get: ApiGet = (path) => apiQueue.run(() => rawApiFetch({ fetch: fetch(), path }));

const slices = $derived(overlay.slices());
const showIds = $derived(progressShowIds({ type: data.type, slices, options: data.options }));
let shows = $state.raw<ReadonlyMap<number, CachedShow>>(new Map());
let loaded = $state(false);
const catalogs = new SvelteMap<number, ShowCatalog>();
const expanding = new SvelteSet<number>();

const merge = (next: ReadonlyMap<number, CachedShow>) => {
  shows = new Map([...shows, ...next]);
};

// The summaries, read again only when the tab's set of shows changes (a watch of a new show, say).
const key = $derived(showIds.ready ? showIds.ids.join(',') : null);
$effect(() => {
  if (key === null) return;
  untrack(() => {
    if (!showIds.ready) return;
    void loadProgressShows({
      slug: data.profile.slug,
      ids: showIds.ids,
      watched: new Set(slices.watchedShows?.keys() ?? []),
      watchlistOnly: showIds.watchlistOnly,
      store: showCache.summaries,
      get,
      publicGet: showCache.get,
    })
      .then(merge)
      .catch(() => toast.error('Doh! There was an error loading your shows.'))
      .finally(() => (loaded = true));
  });
});

const items = $derived(
  showIds.ready && loaded
    ? toProgressItems({ type: data.type, showIds, slices, shows, catalogs, options: data.options, now }).items
    : null,
);

// `?list=`: the list's shows, read once.
let listed = $state.raw<ReadonlySet<number> | null>(null);
$effect(() => {
  const list = data.list;
  if (list === undefined) return;
  listed = null;
  void fetchListItemRefs({
    fetch: fetch(),
    base: `/lists/${list}/items`,
    query: { types: ['show'], genres: [] },
    sort: { by: 'rank', how: 'asc' },
  })
    .then((refs) => (listed = new Set(refs.map(({ trakt }) => trakt))))
    .catch(() => {
      listed = new Set();
      toast.error("Doh! We couldn't load that list.");
    });
});

// Posters already asked for this visit, so a show without one isn't read again on every recompute. Nothing renders
// from it, so it isn't reactive.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const askedPosters = new Set<number>();

/** The page's posters: shows whose summary came from a bulk read without images. */
function visible(ids: readonly number[]) {
  const missing = ids.filter((id) => shows.get(id)?.complete === false && !askedPosters.has(id));
  missing.forEach((id) => askedPosters.add(id));
  if (missing.length === 0) return;
  void loadCachedShows({ ids: missing, store: showCache.summaries, get: showCache.get }).then(merge);
}

async function expand(id: number) {
  if (catalogs.has(id) || expanding.has(id)) return;
  expanding.add(id);
  try {
    catalogs.set(id, await loadShowCatalog({ id, store: showCache.catalogs, get: showCache.get }));
  } catch {
    toast.error("Doh! We couldn't load this show's seasons.");
  } finally {
    expanding.delete(id);
  }
}
</script>

<ProgressList {data} {items} {listed} {expanding} onexpand={expand} onvisible={visible} />
