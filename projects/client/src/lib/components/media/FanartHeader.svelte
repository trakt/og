<!--
  OG's `#summary-wrapper`: the full-bleed fanart at the top of every movie, show, season, episode and person page.
  It runs under the fixed site header, so its height includes --header-height. `children` is the title block,
  pinned to the bottom of the page container; `stats` is the dark strip along the bottom edge; `edges` sits over the
  whole header, for the previous and next arrows.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import type { Attachment } from 'svelte/attachments';

interface Caption {
  /** Who they played, or their jobs. */
  readonly characters?: string;
  /** The department, shown after the characters: "Acting". */
  readonly role?: string;
  readonly title: string;
  readonly year?: number;
  readonly href: string;
}

interface Props {
  image?: string;
  /** Episodes use a sufficiently large screenshot, falling back to show fanart on failure. */
  screenshot?: string;
  /** Subpages ("Comments for...") use the short header. */
  slim?: boolean;
  dropped?: boolean;
  caption?: Caption;
  children: Snippet;
  stats?: Snippet;
  /** Stats pages for seasons and episodes have a 55px ratings strip. */
  statsHeight?: string;
  edges?: Snippet;
}

const { image, screenshot, slim = false, dropped = false, caption, children, stats, statsHeight, edges }: Props =
  $props();
let loadedScreenshot = $state<string>();
const loadScreenshot: Attachment<HTMLElement> = () => {
  loadedScreenshot = undefined;
  if (!screenshot) return;
  const candidate = new Image();
  candidate.onload = () => {
    if (candidate.naturalWidth >= 1024 || candidate.naturalHeight >= 720 || matchMedia('(width < 768px)').matches) {
      loadedScreenshot = screenshot;
    }
  };
  candidate.src = screenshot;
  return () => {
    candidate.onload = null;
  };
};
const backdrop = $derived(loadedScreenshot ?? image);
</script>

<!-- The caption links to the item the fanart came from, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section
  class={['fanart-header', { slim, dropped, 'with-stats': stats }]}
  style:--stats-height={statsHeight}
  style:background-image={backdrop ? `url("${backdrop}")` : undefined}
  {@attach loadScreenshot}
>
  {#if dropped}<span class="dropped-layer"></span>{/if}
  <div class="shadow-base">
    {#if caption}
      <p class="caption">
        {#if caption.characters}
          <span class="characters">
            {caption.characters}
            {#if caption.role}<span class="role">({caption.role})</span>{/if}
          </span>
        {/if}
        <a href={caption.href}>{caption.title} {#if caption.year}<span class="year">{caption.year}</span>{/if}</a>
      </p>
    {/if}
  </div>
  {@render edges?.()}
  <div class="summary">
    {@render children()}
  </div>
  {#if stats}
    <div class="stats">
      <div class="stats-inner">{@render stats()}</div>
    </div>
  {/if}
</section>

<style>
.fanart-header {
  --stats-height: 60px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  block-size: calc(var(--fanart-header-height) + var(--header-height));
  background-color: var(--color-page);
  background-position: 50% 10%;
  background-size: cover;
  color: var(--color-card-text);

  &.slim {
    --item-nav-top: var(--item-nav-top-slim);
    block-size: calc(var(--fanart-header-height-slim) + var(--header-height));
  }

  &.slim.with-stats {
    block-size: calc(var(--fanart-header-height-slim) + var(--stats-height) + var(--header-height));
  }
}

.dropped-layer {
  position: absolute;
  inset: 0;
  background: var(--gradient-dropped);
}

.shadow-base {
  position: absolute;
  inset-inline: 0;
  inset-block-end: var(--stats-height);
  block-size: 120px;
  background: var(--gradient-shadow-header);

  .fanart-header:not(.with-stats) & {
    inset-block-end: 0;
  }
}

/* OG's #fanart-info, hidden on phones. */
.caption {
  position: absolute;
  inset-block-end: 15px;
  inset-inline-end: 15px;
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  text-align: end;
  text-shadow: var(--text-shadow-headings);

  @media (width < 768px) {
    display: none;
  }
}

.characters {
  display: block;
  line-height: 1;
}

.role,
.year {
  color: var(--color-fanart-caption-muted);
}

.caption a {
  color: var(--color-card-text);
  text-decoration: none;

  & .year {
    font-weight: var(--font-weight-headings-light);
  }
}

/* OG pinned the title block 70px above the bottom edge (10px on a slim header without stats). */
.summary {
  position: relative;
  inline-size: 100%;
  max-inline-size: var(--container-lg);
  margin-inline: auto;
  margin-block-end: 70px;
  padding-inline: calc(var(--gutter) / 2);

  .fanart-header:not(.with-stats) & {
    margin-block-end: 10px;
  }

  & :global(h1) {
    margin: 0;
    line-height: 1.2;
    text-shadow: var(--text-shadow-headings);
  }
}

.stats {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  background-color: var(--color-stats-bar);
}

.stats-inner {
  max-inline-size: var(--container-lg);
  min-block-size: var(--stats-height);
  margin-inline: auto;
  padding: 10px calc(var(--gutter) / 2);
}

@media (width < 1200px) {
  .summary,
  .stats-inner {
    max-inline-size: var(--container-md);
  }
}

@media (width < 992px) {
  .summary,
  .stats-inner {
    max-inline-size: var(--container-sm);
  }
}
</style>
