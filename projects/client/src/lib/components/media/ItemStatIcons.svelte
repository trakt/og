<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import user from '$lib/icons/trakt/user.svg?raw';
import check from '$lib/icons/trakt/check.svg?raw';
import collection from '$lib/icons/trakt/collection.svg?raw';
import list from '$lib/icons/trakt/list.svg?raw';
import comment from '$lib/icons/trakt/comment.svg?raw';
import { readableStat } from '$lib/utils/readableStat';

interface Props {
  href: string;
  stats?: { watchers: number; plays: number; collectors: number; lists: number } | null;
  comments?: number;
  compact?: boolean;
}
const { href, stats, comments = 0, compact = false }: Props = $props();
const entries = $derived([
  { label: 'Watchers', icon: user, count: stats?.watchers ?? 0 },
  { label: 'Plays', icon: check, count: stats?.plays ?? 0, check: true },
  { label: 'Collected', icon: collection, count: stats?.collectors ?? 0 },
  { label: 'Lists', icon: list, count: stats?.lists ?? 0, href: `${href}/lists` },
  ...(!compact ? [{ label: 'Comments', icon: comment, count: comments, href: `${href}/comments` }] : []),
]);
</script>
<!-- Item URLs come from the media mappers. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class={['item-stats', { compact }]} aria-label="Community stats">
  {#each entries as entry (entry.label)}
    <span class="slot">
      {#if entry.count > 0}
        <Tooltip text={entry.label}>
          {#snippet trigger(tooltip)}
            <a href={entry.href ?? `${href}/stats`} class:check={entry.check} aria-label="{entry.count.toLocaleString('en-US')} {entry.label.toLowerCase()}" {...tooltip}>
              <Icon svg={entry.icon} />{readableStat(entry.count)}
            </a>
          {/snippet}
        </Tooltip>
      {/if}
    </span>
  {/each}
</div>

<style>
.item-stats {
  display: flex;
  align-items: center;
  min-block-size: var(--item-stats-row-height);
  gap: var(--item-stats-gap);
  font-family: var(--font-headings);
  font-size: var(--font-size-episode-meta);
  color: var(--color-episode-stat);
}
.slot {
  display: flex;
  align-items: center;
}
.slot:empty {
  display: none;
}
a {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  line-height: 1;
  gap: var(--item-stats-icon-gap);
}
.item-stats :global(svg) {
  font-size: var(--font-size-episode-stat-icon);
}
.check :global(svg) {
  font-size: var(--item-stats-check-size);
}
.compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, var(--item-stats-row-height));
  gap: 0 var(--item-stats-compact-gap);
  font-size: var(--font-size-card-subtitle);
  margin-block-start: var(--space-sm-block);
  & .slot:empty {
    display: block;
  }
}
</style>
