<script lang="ts">
import { tick } from 'svelte';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { fetchOnDeckItem } from '$lib/dashboard/fetchOnDeckItem';
import type { DashboardSettings } from '$lib/dashboard/DashboardSettings';
import OnDeckCard from '$lib/components/media/OnDeckCard.svelte';
import type { OnDeckItem } from '$lib/components/media/OnDeckItem';
import { toast } from '$lib/components/toast/toast.svelte';
import { overlay } from '$lib/overlay/overlay';

const { initial, username, settings }: {
  initial: OnDeckItem;
  username: string;
  settings: DashboardSettings['upNext'];
} = $props();
let item = $derived(initial);
let refreshing = $state(false);
let needsRefresh = $state(false);
let card = $state<HTMLDivElement>();
const autoRefresh = $derived(settings.refresh);
const displayed = $derived({ ...item, rewatching: item.rewatching || !!overlay.state('show', item.showId).rewatching });
$effect(() => {
  void initial;
  void username;
  needsRefresh = false;
  refreshing = false;
});
async function refresh() {
  if (refreshing) return;
  const source = initial;
  const viewer = username;
  const returnFocus = card?.contains(document.activeElement) &&
    document.activeElement?.classList.contains('refresh-cover');
  refreshing = true;
  const [result] = await Promise.allSettled([
    fetchOnDeckItem({ item, username, settings, fetch: authenticatedFetch({ manager: userManager() }) }),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
  if (source !== initial || viewer !== username) return;
  refreshing = false;
  if (result?.status === 'fulfilled') {
    item = result.value;
    needsRefresh = false;
  } else {
    needsRefresh = true;
    toast.error('Doh! There was an error refreshing this show. Please try Next Episode again.');
  }
  await tick();
  if (returnFocus && document.activeElement === document.body) {
    card?.querySelector<HTMLElement>(result?.status === 'fulfilled' ? '.titles-link' : 'button.refresh-cover')?.focus({
      preventScroll: true,
    });
  }
}
function watched(watchedAt: string | null) {
  if (watchedAt === null) {
    needsRefresh = false;
    return;
  }
  needsRefresh = true;
  if (autoRefresh) void refresh();
}
</script>

<div bind:this={card}>
  <OnDeckCard item={displayed}
    state={item.complete ? overlay.state('show', item.showId) : overlay.state('episode', item.episodeId)} {refreshing}
    {needsRefresh}
    onWatchSave={watched} onRefresh={() => void refresh()} onRewatch={() => void refresh()} />
</div>
