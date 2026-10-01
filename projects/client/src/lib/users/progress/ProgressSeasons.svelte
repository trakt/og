<!--
  The seasons band under a progress row: "+ view
  seasons" opens a row per season with its own tick bar, a season's toggle opens its "1x05" episode chips, and
  "+ view all" opens every season at once. OG's toggles were spans; these are buttons that say whether they're open.
  The row reads the show's catalog as the band opens, so it says it's loading until the seasons are in.
  A season's hide icon takes it out of your progress (`progress_watched` or `progress_collected`),
  and the season leaves the list as the hide saves.
-->
<script lang="ts">
import { SvelteSet } from 'svelte/reactivity';
import { removeCard } from '$lib/components/media/removeCard';
import TickBar from '$lib/components/media/TickBar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import Icon from '$lib/icons/Icon.svelte';
import minus from '$lib/icons/solid/minus.svg?raw';
import plus from '$lib/icons/solid/plus.svg?raw';
import ban from '$lib/icons/thin/ban.svg?raw';
import chevron from '$lib/icons/thin/circle-chevron-right.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import collection from '$lib/icons/trakt/collection.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';
import { createProgressRemovals } from './createProgressRemovals.svelte.ts';
import type { ProgressType } from './progressTypes.ts';
import type { ProgressEpisode, ProgressSeason } from './toProgressRow.ts';

interface Props {
  /** The show's id, for the element ids and the hide. */
  id: number;
  /** The show's title, for the hide's toast. */
  title: string;
  seasons: readonly ProgressSeason[];
  type: ProgressType;
  simple: boolean;
  /** The band is open. */
  open?: boolean;
  /** The seasons are still loading. */
  loading?: boolean;
  /** The band opened or closed. */
  ontoggle?: (open: boolean) => void;
}

let { id, title, seasons, type, simple, open = $bindable(false), loading = false, ontoggle }: Props = $props();
const removals = createProgressRemovals<number>();
const shown = $derived(seasons.filter((season) => !removals.has(season.number)));
let list = $state<HTMLUListElement>();

const openSeasons = new SvelteSet<number>();

function toggleSeason(number: number) {
  if (openSeasons.has(number)) openSeasons.delete(number);
  else openSeasons.add(number);
}

function setOpen(next: boolean) {
  open = next;
  ontoggle?.(next);
}

// "view all" asked before the seasons loaded: open them as they arrive.
let wantsAll = $state(false);
$effect(() => {
  if (!wantsAll || seasons.length === 0) return;
  for (const season of seasons) openSeasons.add(season.number);
  wantsAll = false;
});

function openAll() {
  wantsAll = true;
  if (!open) setOpen(true);
}

/** The focus moves to the next season's hide icon (or the seasons toggle) before this one fades out. */
function hide(number: number, saved: Promise<boolean>) {
  const hides = [...(list?.querySelectorAll<HTMLElement>(':scope > .season .hide .visibility-trigger') ?? [])];
  const index = shown.findIndex((season) => season.number === number);
  const nextHide = [...hides.slice(index + 1), ...hides.slice(0, index).toReversed()].at(0);
  void removals.track(number, saved);
  (nextHide ?? list?.parentElement?.querySelector<HTMLElement>('.toggle.link'))?.focus({ preventScroll: true });
}

const doneIcon = $derived(type === 'watched' ? check : collection);
const doneWord = $derived(type === 'watched' ? 'watched' : 'in your library');
const spoken = (episode: ProgressEpisode) =>
  [
    episode.label,
    episode.done ? doneWord : `not ${doneWord}`,
    episode.plays && `${episode.plays.text} (${episode.plays.detail})`,
    episode.activity && `${episode.activity.prefix} ${episode.activity.date}`,
  ].filter(Boolean).join(', ');
</script>

<!-- Season and episode pages are OG routes og hasn't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet chipLink(episode: ProgressEpisode, tooltip = {})}
  <a href={episode.href} aria-label={spoken(episode)} {...tooltip}><Icon
      svg={episode.done ? doneIcon : deleteIcon}
    />{episode.label}</a>
{/snippet}

{#snippet episodeChip(episode: ProgressEpisode)}
  <li class={['episode', episode.done ? 'done' : 'missing']}>
    {#if episode.plays || episode.activity}
      <Tooltip placement="bottom">
        {#snippet trigger(tooltip)}{@render chipLink(episode, tooltip)}{/snippet}
        {#if episode.plays}{episode.plays.text} — <em>{episode.plays.detail}</em>{/if}
        {#if episode.plays && episode.activity}<span class="divider"></span>{/if}
        {#if episode.activity}<em>{episode.activity.prefix}</em><br />{episode.activity.date}{/if}
      </Tooltip>
    {:else}
      {@render chipLink(episode)}
    {/if}
  </li>
{/snippet}

<div class="seasons">
  <button type="button" class="toggle link" aria-expanded={open} aria-controls="seasons-{id}"
    onclick={() => setOpen(!open)}><Icon svg={open ? minus : plus} />view seasons</button>
  <button type="button" class="toggle link" onclick={openAll}><Icon svg={plus} />view all</button>

  {#if open && loading}<p class="loading" role="status">Loading seasons…</p>{/if}
  <ul bind:this={list} class="season-list" id="seasons-{id}" hidden={!open} aria-busy={loading}>
    {#each shown as season (season.number)}
      {@const expanded = openSeasons.has(season.number)}
      <li class="season" out:removeCard={() => true}>
        <div class="info">
          <button type="button" class="toggle" aria-expanded={expanded} aria-controls="season-{id}-{season.number}"
            onclick={() => toggleSeason(season.number)}><Icon svg={expanded ? minus : plus} /><span
              class="season-title"
            >{season.title}</span></button>
          <Tooltip text="{season.title} page" placement="bottom">
            {#snippet trigger(tooltip)}
              <a class="season-link" href={season.href} target="_blank" aria-label="{season.title} page"
                {...tooltip}><Icon svg={chevron} fixedWidth /></a>
            {/snippet}
          </Tooltip>
          <span class="hide">
            <VisibilityControl
              target={{ type: 'season', id, title: `${title} ${season.title}`, season: { show: id, number: season.number } }}
              action="hide" section={type === 'watched' ? 'progress_watched' : 'progress_collected'} variant="badge"
              onsaving={(saved) => hide(season.number, saved)}><Icon svg={ban} fixedWidth /></VisibilityControl>
          </span>
          <span class="episode-count">{season.summary}</span>
        </div>
        <TickBar runs={season.ticks} percent={season.percent} {simple} size="season"
          label="{season.title}: {season.percent}% {doneWord}" />
        <ul class="episodes" id="season-{id}-{season.number}" hidden={!expanded}>
          {#if expanded}
            {#each season.episodes as episode (episode.key)}{@render episodeChip(episode)}{/each}
          {/if}
        </ul>
      </li>
    {/each}
  </ul>
</div>

<style>
/* `.seasons`: a band out to the column's gutters. */
.seasons {
  margin: var(--progress-seasons-margin);
  padding: var(--progress-seasons-padding);
  background-color: var(--color-progress-seasons-bg);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.loading {
  margin: var(--space-xs-block) 0 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.toggle {
  display: inline;
  min-block-size: 0;
  margin: 0 var(--space-xs-inline) 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;

  & :global(.icon) {
    margin-inline-end: 4px;
    color: var(--color-progress-toggle-icon);
    font-size: var(--font-size-progress-toggle-icon);
  }

  &.link {
    color: var(--color-progress-toggle-link);

    & :global(.icon) {
      color: inherit;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

.info {
  display: flex;
  align-items: baseline;
  inline-size: calc((100% + var(--gutter)) * 11 / 12 - var(--gutter));
  margin: var(--progress-season-info-margin);
}

.season-title {
  margin-inline-end: var(--space-xs-inline);
}

.season-link,
.hide {
  font-size: var(--font-size-progress-season-link);
  line-height: 1;
  transition: color var(--transition-card);

  &:is(:hover, :focus-visible),
  &:has(:global(:focus-visible)) {
    color: var(--brand-primary);
  }
}

.season-link {
  color: var(--color-progress-season-link);
}

.hide {
  color: var(--color-progress-season-count);
  font-size: var(--font-size-progress-season-hide);

  /* The icon sits as it did in a plain button. */
  & :global(.visibility-control) {
    display: inline;
  }

  & :global(.visibility-trigger) {
    display: inline-block;
  }

  & :global(.visibility-trigger:focus-visible) {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

.episode-count {
  margin-inline-start: auto;
  padding-block-start: var(--progress-season-count-nudge);
  color: var(--color-progress-season-count);
  font-size: var(--font-size-progress-season-count);
}

.episodes {
  display: flex;
  flex-wrap: wrap;
  column-gap: var(--progress-episode-gap);
  margin-block-start: var(--progress-episodes-margin);
}

.episodes[hidden] {
  display: none;
}

.episode {
  margin-block-start: var(--progress-episode-margin);
  font-size: var(--font-size-progress-episode);

  & a {
    text-decoration: none;
  }

  & :global(.icon) {
    margin: -1px 2px 0 0;
    font-size: var(--font-size-progress-episode-icon);
    vertical-align: middle;
  }

  &.done a {
    color: var(--color-progress-episode-done);
  }

  &.missing a {
    color: var(--brand-primary);
  }
}

/* OG's `.tooltip-hr` between the plays and the date. */
.divider {
  display: block;
  margin-block: var(--space-tooltip-divider);
  border-block-end: 1px solid var(--color-tooltip-divider);
}

@media (width < 768px) {
  .seasons {
    margin: var(--progress-seasons-margin-phone);
    padding: var(--progress-seasons-padding-phone);
  }

  .info {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .season-link,
  .hide {
    transition: none;
  }
}
</style>
