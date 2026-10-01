<script lang="ts">
import { page } from '$app/state';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import { overlay } from '$lib/overlay/overlay';
import { toast } from '$lib/components/toast/toast.svelte';
import WatchPopover from '$lib/components/history/WatchPopover.svelte';
import { loadWatchEpisodes } from '$lib/components/history/loadWatchEpisodes';
import type { WatchTarget } from '$lib/components/history/WatchTarget';
import CollectionMetadataFields from '$lib/components/collection/CollectionMetadataFields.svelte';
import type { CollectionMetadata } from '$lib/components/collection/CollectionMetadata';
import { collectMedia } from '$lib/components/collection/collectMedia';
import { collectionMetadataLabel } from '$lib/components/collection/collectionMetadataLabel';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import collection from '$lib/icons/trakt/collection.svg?raw';
import collectionThick from '$lib/icons/trakt/collection-thick.svg?raw';
import { formatDate } from '$lib/utils/formatDate';

interface Props {
  target: WatchTarget;
  variant?: 'summary' | 'card';
  small?: boolean;
  onremove?: () => void;
  /** After a save goes through, with its date (`null` for a removal, left out for metadata only). */
  onsave?: (collectedAt: string | null | undefined) => void;
}
const { target, variant = 'card', small = false, onremove, onsave }: Props = $props();
let busy = $state(false);
let draft = $state<CollectionMetadata | undefined>();
const viewerState = $derived(overlay.state(target.type, target.id, target.season));
const dates = $derived(page.data.datePreferences);
const fill = $derived(
  quickIconFill({
    state: viewerState,
    airedEpisodes: target.airedEpisodes,
    season: target.type === 'season',
    datePreferences: dates,
  }),
);
const plural = $derived(target.type === 'show' || target.type === 'season');
const label = $derived(
  fill.collected > 0 ? plural ? `${Math.floor(fill.collected * 100)}% in library` : 'In Library' : 'Add to library',
);
const metadataText = $derived(collectionMetadataLabel(viewerState.collectionMetadata));
const request = (path: string, body?: unknown) =>
  rawApiFetch({
    fetch: path.startsWith('/search/') ? globalThis.fetch : authenticatedFetch({ manager: userManager() }),
    path,
    init: body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });
async function collect(collectedAt: string | null | undefined, force = false) {
  if (busy) return;
  busy = true;
  try {
    const saved = await collectMedia({
      target,
      collectedAt,
      metadata: draft,
      force,
      overlay,
      request,
      notify: toast,
      episodes: () =>
        loadWatchEpisodes({ target, fetch: authenticatedFetch({ manager: userManager() }), progress: 'collection' }),
    });
    if (saved && collectedAt === null) onremove?.();
    if (saved) onsave?.(collectedAt);
  } finally {
    busy = false;
  }
}
async function open(force: boolean): Promise<'date' | 'remove' | 'partial' | null> {
  if (!(await userManager().getUser())?.access_token) {
    await login();
    return null;
  }
  draft = viewerState.collectionMetadata;
  return onremove && !force
    ? 'remove'
    : force || fill.collected === 0
    ? 'date'
    : fill.collected >= 1
    ? 'remove'
    : 'partial';
}
</script>

<!-- Library routes use the same viewer alias as history. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<WatchPopover collection hasMetadata={Object.values(draft ?? {}).some(Boolean)} {variant} {small} {busy} {plural}
  label={onremove ? 'Remove from library' : label} fill={onremove ? 1 : fill.collected} datePreferences={dates}
  tooltip={onremove ? 'Remove from library' : variant === 'card' ? fill.titles.collected ?? 'Add to library' : undefined}
  onopen={open} onwatch={collect} onremaining={() => Promise.resolve(false)}
  oninvalid={() => toast.error('Invalid date format, please use the date picker.')}>
  {#snippet trigger()}
    {#if variant === 'summary'}
      <span class="collection-icon"><Icon svg={collection} fixedWidth /></span>
      <span class="info">
        <span class="main-info">{label}</span>
        {#if fill.collected > 0}
          <span class="under-info">{#if plural}{viewerState.collectedEpisodes}/{target.airedEpisodes} episodes{:else if viewerState.collectedAt}{viewerState.collectedAt.startsWith('1970-01-01') ? 'Unknown date' : formatDate(viewerState.collectedAt, dates)}{/if}</span>
          {#if metadataText}<span class="under-info">{metadataText}</span>{/if}
        {/if}
      </span>
    {:else}<Icon svg={collectionThick} />{/if}
  {/snippet}
  {#snippet metadata(done, saving)}
    <CollectionMetadataFields value={draft ?? {}} {saving} onsave={(value) => { draft = value; done(); if (saving) void collect(undefined); }} />
  {/snippet}
</WatchPopover>
{#if variant === 'summary' && plural && fill.collected > 0 && target.airedEpisodes}
  <Tooltip text={fill.titles.collected} placement="bottom">
    {#snippet trigger(tip)}
      <a class="collection-progress" href="/users/me/library" aria-label={fill.titles.collected} {...tip}>
        {#each Array.from({ length: target.airedEpisodes ?? 0 }) as _, index (index)}<span class:done={index < (viewerState.collectedEpisodes ?? 0)}></span>{/each}
      </a>
    {/snippet}
  </Tooltip>
{/if}

<style>
.collection-icon {
  inline-size: var(--action-icon-width);
  flex-shrink: 0;
  padding-inline: var(--watch-icon-padding);
  font-size: var(--font-size-action-icon);
  line-height: 1;
}
.info {
  padding-block: var(--watch-info-block);
  font-family: var(--font-headings);
}
.main-info {
  display: block;
  font-size: var(--font-size-action);
  font-weight: var(--font-weight-headings);
  line-height: var(--watch-summary-line);
  text-transform: uppercase;
  .info:has(.under-info) & {
    line-height: var(--watch-summary-selected-line);
  }
}
.under-info {
  display: block;
  font-size: var(--watch-detail-size);
  line-height: var(--watch-detail-line);
}
.collection-progress {
  display: flex;
  gap: var(--watch-progress-gap);
  block-size: var(--watch-progress-height);
  background: var(--progress-under-bg);
  & span {
    flex: 1;
  }
  & .done {
    background: var(--brand-quaternary);
  }
}
</style>
