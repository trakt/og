<!--
  OG's `#info-wrapper`: the white section under a summary's fanart. A sticky sidebar on the left rises into the
  fanart (poster, section nav, links), and the content column holds `details` (stats, overview, videos) beside
  `actions` (the button stack), then `children` full width underneath (actors, comments, lists). A `subnav` (the
  seasons' SeasonLinks) runs full width above it all, and the sidebar rises past it.
  Phones drop the sidebar like OG did, so put anything they still need into `details`.
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import type { Snippet } from 'svelte';

interface Props {
  /** Names the sidebar landmark, usually the item's title. */
  label: string;
  subnav?: Snippet;
  sidebar: Snippet;
  details: Snippet;
  /** The sidebar tools, also reachable on phones where OG hid the sidebar. */
  tools?: Snippet;
  actions?: Snippet;
  /** Subpages put their tables across the entire content column. */
  fullWidth?: boolean;
  /** Slim stats headers can have a shorter ratings strip. */
  posterOverlap?: string;
  children?: Snippet;
}

const { label, subnav, sidebar, details, actions, children, tools, posterOverlap, fullWidth = false }: Props = $props();
</script>

<section class={['summary-frame', { 'with-subnav': subnav }]} style:--summary-poster-overlap={posterOverlap}>
  {@render subnav?.()}
  <Container>
    <div class="columns">
      <aside class="sidebar" aria-label={label}>{@render sidebar()}{@render tools?.()}</aside>
      <div class="info" id="overview">
        <div class={["top", { "full-width": fullWidth }]}>
          <div class="details">{@render details()}</div>
          {#if actions}
            <div class="actions">{@render actions()}</div>
          {/if}
        </div>
        {#if tools}<div class="phone-tools">{@render tools()}</div>{/if}
        {@render children?.()}
      </div>
    </div>
  </Container>
</section>

<style>
/*
  Bootstrap's col-md-2 / col-md-10 (col-sm-3 / col-sm-9) with the same 20px gutter. OG's min-height sat on
  `#info-wrapper`, under the subnav, and it's what gives the sticky sidebar room to settle below the header on a
  short page.
*/
.columns {
  min-block-size: var(--summary-min-height);
  display: grid;
  grid-template-columns: calc(var(--summary-offset) - var(--gutter)) minmax(0, 1fr);
  column-gap: var(--gutter);

  @media (width < 992px) {
    grid-template-columns: calc(var(--summary-offset-sm) - var(--gutter)) minmax(0, 1fr);
  }

  @media (width < 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.sidebar {
  position: sticky;
  inset-block-start: calc(var(--summary-sticky-gap) + var(--header-height));
  align-self: start;
  margin-block: calc(-1 * var(--summary-poster-overlap)) var(--gutter);

  .with-subnav & {
    margin-block-start: calc(-1 * var(--summary-poster-overlap-subnav));
  }

  @media (width < 768px) {
    display: none;
  }
}

.phone-tools {
  display: none;
  @media (width < 768px) {
    display: block;
    margin-block: var(--gutter);
  }
}

.info {
  margin-block: var(--gutter);
}

/* col-lg-8 / col-lg-4, then col-md-7 / col-md-5, stacked under 992px. */
.top {
  &.full-width {
    grid-template-columns: minmax(0, 1fr);
  }

  display: grid;
  grid-template-columns: calc((100% + var(--gutter)) * 8 / 12 - var(--gutter)) minmax(0, 1fr);
  column-gap: var(--gutter);

  @media (width < 1200px) {
    grid-template-columns: calc((100% + var(--gutter)) * 7 / 12 - var(--gutter)) minmax(0, 1fr);
  }

  @media (width < 992px) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
