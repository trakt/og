<!--
  OG's previous and next arrows on a summary's fanart (`#previous-item-link`, `#next-item-link`), plus its keys:
  p or Left follows the previous link, n or Right the next, u goes up a level (movie to collection, episode to
  season). Render it in FanartHeader's `edges` slot. The keys stay quiet while you type or hold a modifier.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { swipeDirection } from './swipeDirection.ts';
import Icon from '$lib/icons/Icon.svelte';
import angleLeft from '$lib/icons/light/angle-left.svg?raw';
import angleRight from '$lib/icons/light/angle-right.svg?raw';

interface Link {
  readonly href: string;
  /** The accessible name, e.g. "Previous in Star Wars Collection: Star Wars". */
  readonly label: string;
}

interface Props {
  previous?: Link;
  next?: Link;
  up?: string;
}

const { previous, next, up }: Props = $props();

function onkeydown(event: KeyboardEvent) {
  if (document.querySelector('dialog[open], [popover]:popover-open')) return;
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;

  const href = {
    p: previous?.href,
    ArrowLeft: previous?.href,
    n: next?.href,
    ArrowRight: next?.href,
    u: up,
  }[event.key];
  if (!href) return;

  event.preventDefault();
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- hrefs are built by the page from API slugs
  goto(href);
}
let touch: { x: number; y: number } | null = null;
function ontouchstart(event: TouchEvent) {
  touch = null;
  if (event.touches.length !== 1 || document.querySelector('dialog[open], [popover]:popover-open')) return;
  if (
    event.target instanceof HTMLElement && event.target.closest('a, button, input, textarea, select, [contenteditable]')
  ) return;
  const point = event.touches.item(0);
  if (point) touch = { x: point.clientX, y: point.clientY };
}
function ontouchend(event: TouchEvent) {
  const start = touch;
  touch = null;
  const point = event.changedTouches.item(0);
  if (!start || !point) return;
  const direction = swipeDirection({ start, end: { x: point.clientX, y: point.clientY } });
  const href = direction === 'next' ? next?.href : direction === 'previous' ? previous?.href : undefined;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- API slug links
  if (href) goto(href);
}
</script>

<svelte:window {onkeydown} {ontouchstart} {ontouchend} />

<!-- Hrefs come in as props, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if previous}
  <a class="item-nav previous" href={previous.href} rel="prev" aria-label={previous.label}>
  <Icon svg={angleLeft} />
</a>
{/if}
{#if next}
  <a class="item-nav next" href={next.href} rel="next" aria-label={next.label}>
  <Icon svg={angleRight} />
</a>
{/if}

<style>
.item-nav {
  position: absolute;
  inset-block-start: var(--item-nav-top);
  z-index: 100;
  color: var(--color-card-text);
  font-size: var(--font-size-item-nav);
  line-height: 1;
  filter: var(--shadow-item-nav);
  opacity: 0.5;
  transition: opacity var(--transition-card);

  &:is(:hover, :focus-visible) {
    color: var(--color-card-text);
    opacity: 0.9;
  }
}

.previous {
  inset-inline-start: 20px;
}

.next {
  inset-inline-end: 20px;
}
</style>
