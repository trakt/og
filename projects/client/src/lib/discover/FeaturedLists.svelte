<!--
  Discover's Featured Lists: a four-column grid of curated
  list tiles, two columns below 992px. Each tile links to `/lists/:id` and shows the list's art behind a 60% shade,
  a centred logo, the two-line title and, on the IMDB tiles, a green label. The art fades in once it loads, and
  hovering a tile zooms it, both over 0.5s. Under reduced motion neither animates.
-->
<script lang="ts">
import { resolve } from '$app/paths';
import type { Attachment } from 'svelte/attachments';
import { SvelteSet } from 'svelte/reactivity';
import { featuredLists } from './featuredLists.ts';

const loaded = new SvelteSet<number>();

// The art can finish before hydration, and then its load event is gone.
const whenLoaded = (id: number): Attachment<HTMLImageElement> => (image) => {
  if (image.complete && image.naturalWidth > 0) loaded.add(id);
};
</script>

<section id="lists" class="lists" aria-label="Featured Lists">
  {#each featuredLists as list (list.id)}
    <a class="tile" href={resolve('/lists/[id=listId]', { id: String(list.id) })}>
      <img
        class={['background', { current: loaded.has(list.id) }]}
        src={list.background}
        alt=""
        loading="lazy"
        decoding="async"
        onload={() => loaded.add(list.id)}
        {@attach whenLoaded(list.id)}
      />
      <span class="shade">
        <img class="logo" src={list.logo} alt="" loading="lazy" decoding="async" />
        <span class="title">{list.title[0]}<br />{list.title[1]}</span>
        {#if list.label}<span class="label">{list.label}</span>{/if}
      </span>
    </a>
  {/each}
</section>

<style>
.lists {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-block-start: 1px solid var(--color-slider-bg);
  background-color: var(--color-slider-bg);

  @media (width < 992px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.tile {
  position: relative;
  display: block;
  block-size: var(--featured-list-height);
  overflow: hidden;
  background-color: var(--color-slider-bg);
  color: var(--color-slider-text);
  text-align: center;

  &:is(:hover, :focus-visible) {
    color: var(--color-slider-text);
    text-decoration: none;
  }

  /* The art and shade are positioned, so they'd paint over the link's own ring: the shade draws it. */
  &:focus-visible {
    outline: 0;
  }

  &:focus-visible .shade {
    outline: 2px solid var(--color-input-border-focus);
    outline-offset: -2px;
  }

  @media (width < 992px) {
    block-size: var(--featured-list-height-tablet);
  }
}

.background {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  opacity: 0;

  &.current {
    opacity: 1;
  }

  .tile:hover & {
    transform: scale(var(--featured-list-zoom));
  }
}

.shade {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-slider-shade);
}

.logo {
  max-inline-size: var(--featured-list-logo-width);
  max-block-size: var(--featured-list-logo-height);

  @media (width < 992px) {
    block-size: var(--featured-list-logo-height-tablet);
  }
}

.title {
  margin-block-start: var(--featured-list-title-gap);
  font-family: var(--font-headings);
  font-size: var(--font-size-featured-list-title);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-featured-list-title);
}

.label {
  margin-block-start: var(--featured-list-label-gap);
  padding: var(--featured-list-label-padding);
  border-radius: var(--radius-featured-list-label);
  background-color: var(--color-featured-list-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-featured-list-label);
  font-weight: var(--font-weight-headings-heavy);
  letter-spacing: var(--letter-spacing-featured-list-label);
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (prefers-reduced-motion: no-preference) {
  .background {
    transition: all var(--transition-slider);
  }
}
</style>
