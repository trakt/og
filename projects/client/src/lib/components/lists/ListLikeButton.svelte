<!-- The list's likes count doubles as OG's like toggle. Initial liked state waits on; a first click likes. -->
<script lang="ts">
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { changeListLike } from '$lib/components/lists/changeListLike';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import voteYes from '$lib/icons/trakt/vote-yes.svg?raw';
import voteYesThick from '$lib/icons/trakt/vote-yes-thick.svg?raw';

interface Props {
  id: number;
  ownerSlug?: string;
  viewer: string | null;
  count: number;
  words?: boolean;
}
const { id, ownerSlug, viewer, count, words = false }: Props = $props();
let liked = $state<boolean | undefined>();
let delta = $state(0);
let busy = $state(false);
const scope = $derived(`${viewer}:${ownerSlug}:${id}:${count}`);
$effect(() => {
  void scope;
  liked = undefined;
  delta = 0;
  busy = false;
});
const total = $derived(Math.max(0, count + delta));
async function toggle() {
  if (busy) return;
  if (!viewer) {
    location.assign('/login');
    return;
  }
  const key = scope;
  busy = true;
  await changeListLike({
    fetch: authenticatedFetch({ manager: userManager() }),
    id,
    ownerSlug,
    liked: !liked,
    patch: () => {
      const before = { liked, delta };
      delta += liked ? -1 : 1;
      liked = !liked;
      return () => {
        if (scope !== key) return;
        liked = before.liked;
        delta = before.delta;
      };
    },
    notify: (message) => {
      if (scope === key) toast.error(message);
    },
  });
  if (scope === key) busy = false;
}
</script>

<Tooltip text="Likes">
  {#snippet trigger(tooltip)}
    <button type="button" class="like" aria-label={`${liked ? 'Unlike' : 'Like'} this list: ${total.toLocaleString('en-US')} ${total === 1 ? 'like' : 'likes'}`}
      aria-pressed={liked === undefined ? undefined : liked} aria-busy={busy} aria-disabled={busy} onclick={toggle} {...tooltip}>
      <span class="icon"><Icon svg={liked ? voteYesThick : voteYes} /></span>{total.toLocaleString('en-US')}
      {#if words}<span class="words"> {total === 1 ? 'like' : 'likes'}</span>{/if}
    </button>
  {/snippet}
</Tooltip>

<style>
.like {
  display: inline;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  white-space: nowrap;
}
.words {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.icon {
  display: inline-block;
  margin-inline-end: var(--list-like-icon-gap);
  font-size: var(--font-size-list-row-action);
  line-height: 1;
  vertical-align: top;
  margin-block-start: var(--list-stat-like-nudge);
}
</style>
