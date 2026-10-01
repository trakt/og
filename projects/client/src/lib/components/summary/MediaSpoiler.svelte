<script lang="ts">
import { page } from '$app/state';
import { overlay } from '$lib/overlay/overlay';
import { mediaSpoilers } from '$lib/settings/mediaSpoilers';
import type { SpoilerTarget } from '$lib/settings/SpoilerTarget';
import type { Snippet } from 'svelte';
import SpoilerContent from './SpoilerContent.svelte';

const { target, kind, inline = false, children }: {
  target?: SpoilerTarget;
  kind: keyof ReturnType<typeof mediaSpoilers>;
  inline?: boolean;
  children: Snippet;
} = $props();
const hidden = $derived(
  target && page.data.user
    ? mediaSpoilers({
      spoilers: page.data.settings?.browsing?.spoilers,
      type: target.type,
      watched: overlay.state(target.type, target.id, target.season).watched,
    })[kind]
    : false,
);
</script>

{#key `${page.data.user?.slug}:${target?.type}:${target?.id}:${kind}`}
  <SpoilerContent {hidden} {inline}>{@render children()}</SpoilerContent>
{/key}
