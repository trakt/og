<!--
  OG's fanart slider: one slide at a time
  over its fanart behind a 60% black shade, large chevrons on the edges that wrap around, and an uppercase title in
  the top-left with an optional link (`action`) on the right. With `ranks`, a row of numbered pills along the bottom
  picks a slide; with `keys`, `p` or left and `n` or right step through the slides while focus is inside.
  A slide's fanart loads the first time it's shown and fades in, and the slides cross-fade, both over 0.5s. Under
  reduced motion they switch at once.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import angleLeft from '$lib/icons/light/angle-left.svg?raw';
import angleRight from '$lib/icons/light/angle-right.svg?raw';
import type { Snippet } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { SvelteSet } from 'svelte/reactivity';
import { slideStep } from './slideStep.ts';

interface Props {
  /** The h2 in the top-left. */
  title: string;
  /** One fanart URL a slide (`undefined` for none). Its length is the slide count. */
  fanarts: readonly (string | undefined)[];
  /** The slide's content, centred over the shade. */
  slide: Snippet<[number]>;
  /** Floated to the title's right: a see-more link. */
  action?: Snippet;
  /** The numbered pills along the bottom. */
  ranks?: boolean;
  /** `p` or left and `n` or right, while focus is inside the slider. */
  keys?: boolean;
}

const { title, fanarts, slide, action, ranks = false, keys = false }: Props = $props();
const id = $props.id();

let selected = $state(0);
// OG loaded a slide's fanart the first time it was selected. The first one shows on load.
const shown = new SvelteSet([0]);
const loaded = new SvelteSet<number>();

function show(index: number | undefined) {
  if (index === undefined) return;
  selected = index;
  shown.add(index);
}

const step = (delta: -1 | 1 | string) => slideStep(selected, fanarts.length, delta);

function onkeydown(event: KeyboardEvent) {
  if (!keys || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;
  if (document.querySelector('dialog[open], [popover]:popover-open')) return;

  const next = step(event.key);
  if (next === undefined) return;
  event.preventDefault();
  show(next);
}

// Mousetrap on the slider in OG: the keys only work while focus is inside it.
const keyNav: Attachment<HTMLElement> = (node) => {
  node.addEventListener('keydown', onkeydown);
  return () => node.removeEventListener('keydown', onkeydown);
};

// The fanart can finish before hydration, and then its load event is gone.
const whenLoaded = (index: number): Attachment<HTMLImageElement> => (image) => {
  if (image.complete && image.naturalWidth > 0) loaded.add(index);
};
</script>

<section class="fanart-slider" aria-labelledby="{id}-title" aria-roledescription="carousel" {@attach keyNav}>
  <div class="titles">
    {#if action}<span class="action">{@render action()}</span>{/if}
    <h2 id="{id}-title">{title}</h2>
  </div>

  <button type="button" class="nav previous" aria-label="Previous" onclick={() => show(step(-1))}>
    <Icon svg={angleLeft} />
  </button>
  <button type="button" class="nav next" aria-label="Next" onclick={() => show(step(1))}>
    <Icon svg={angleRight} />
  </button>

  {#if ranks}
    <div class="ranks">
      {#each fanarts as _, index (index)}
        <button
          type="button"
          class="rank"
          aria-label="Show {index + 1}"
          aria-pressed={index === selected}
          onclick={() => show(index)}
        >{index + 1}</button>
      {/each}
    </div>
  {/if}

  <div class="slides" aria-live="polite">
    {#each fanarts as fanart, index (index)}
      <div
        class={['slide', { selected: index === selected }]}
        role="group"
        aria-roledescription="slide"
        aria-label="{index + 1} of {fanarts.length}"
        inert={index !== selected}
      >
        {#if fanart && shown.has(index)}
          <img
            class={['background', { current: loaded.has(index) }]}
            src={fanart}
            alt=""
            decoding="async"
            onload={() => loaded.add(index)}
            {@attach whenLoaded(index)}
          />
        {/if}
        <div class="shade">
          {@render slide(index)}
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
/* The viewport less OG's header, unless the page sets `--fanart-slider-height` (discover's Trends does). */
.fanart-slider {
  position: relative;
  block-size: var(--fanart-slider-height, var(--slider-height-short));
  overflow: hidden;
  background-color: var(--color-slider-bg);
  color: var(--color-slider-text);

  @media (width < 768px) {
    min-block-size: var(--slider-min-height-phone);
  }
}

.titles {
  position: absolute;
  inset-block-start: var(--slider-titles-top);
  inset-inline: 0;
  z-index: 30;
  padding-inline: var(--slider-titles-inline);

  @media (width < 768px) {
    inset-block-start: var(--slider-titles-top-phone);
    padding-inline: var(--slider-titles-inline-phone);
  }
}

h2 {
  margin: 0;
  color: var(--color-slider-text);
  font-size: var(--font-size-slider-title);
  font-weight: var(--font-weight-headings-heavy);
  text-shadow: var(--text-shadow-headings);
  text-transform: uppercase;
}

.action {
  float: inline-end;
  line-height: 1;
  text-shadow: var(--text-shadow-headings);

  & :global(a) {
    color: var(--color-slider-link);
    line-height: 1;
  }

  & :global(a:is(:hover, :focus-visible)) {
    color: var(--color-slider-text);
    text-decoration: none;
  }
}

.nav {
  position: absolute;
  inset-block: var(--slider-nav-top) var(--slider-nav-bottom);
  z-index: 25;
  display: flex;
  align-items: center;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-slider-text);
  font-size: var(--font-size-item-nav);
  line-height: 1;
  filter: var(--shadow-item-nav);
  opacity: 0.5;
  cursor: pointer;

  &:is(:hover, :focus-visible) {
    opacity: 0.9;
  }
}

.previous {
  inset-inline-start: var(--slider-nav-inline);
}

.next {
  inset-inline-end: var(--slider-nav-inline);
}

.ranks {
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
}

.rank {
  inline-size: var(--slider-rank-width);
  min-block-size: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background-color: var(--color-slider-rank-bg);
  color: var(--color-slider-rank);
  font-family: var(--font-headings);
  font-size: var(--font-size-slider-rank);
  font-weight: var(--font-weight-headings);
  line-height: var(--slider-rank-height);
  text-align: center;
  cursor: pointer;

  &:hover {
    background-color: var(--color-slider-rank-hover);
    color: var(--color-slider-text);
  }

  &[aria-pressed='true'] {
    background-color: var(--brand-primary);
    color: var(--color-slider-text);
    font-weight: var(--font-weight-headings-heavy);
  }
}

.slide,
.background,
.shade {
  position: absolute;
  inset: 0;
}

.slide {
  opacity: 0;

  &.selected {
    z-index: 20;
    opacity: 1;
  }
}

.background {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;

  &.current {
    opacity: 1;
  }
}

.shade {
  display: grid;
  place-items: center;
  background-color: var(--color-slider-shade);
  color: var(--color-slider-text);
  text-align: center;
}

@media (prefers-reduced-motion: no-preference) {
  .nav,
  .rank,
  .slide,
  .background,
  .action :global(a) {
    transition: all var(--transition-slider);
  }
}
</style>
