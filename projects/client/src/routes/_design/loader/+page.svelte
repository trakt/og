<!--
  The liquid-fill loader at every size we use, on a light and a dark ground, with the reduced-motion breathe next to it.
  The last row is static/loader.svg as a plain <img>, the version for places outside Svelte.
-->
<script lang="ts">
import Header from '$lib/components/header/Header.svelte';
import TraktLoader from '$lib/components/loading/TraktLoader.svelte';

const sizes = [16, 32, 64, 128];
const schemes = ['light', 'dark'] as const;
</script>

<svelte:head>
  <title>Loader · og design system</title>
</svelte:head>

<Header user={null} />

<main>
  <section class="intro">
    <h1>Loader</h1>
    <p>
      <code>TraktLoader</code>: red rises in a wave behind the monogram until the disc is full, then drains. Below 24px
      the surface rises flat. With reduced motion, or <code>reducedMotion</code>, the full mark breathes instead.
    </p>
  </section>

  <div class="swatches">
    {#each schemes as scheme (scheme)}
      <section class="swatch" style:color-scheme={scheme} aria-labelledby="{scheme}-heading">
        <h2 id="{scheme}-heading">{scheme === 'light' ? 'Light' : 'Dark'}</h2>
        <h3>Animated</h3>
        <div class="row" data-row="animated">
          {#each sizes as size (size)}<TraktLoader {size} label="Loading at {size}px" />{/each}
        </div>
        <h3>Reduced motion</h3>
        <div class="row" data-row="reduced">
          {#each sizes as size (size)}<TraktLoader {size} reducedMotion label="Loading at {size}px" />{/each}
        </div>
        <h3>static/loader.svg</h3>
        <div class="row" data-row="static">
          {#each sizes as size (size)}<img src="/loader.svg" width={size} height={size} alt="Loading" />{/each}
        </div>
      </section>
    {/each}
  </div>
</main>

<style>
main {
  padding-block-start: var(--header-height);
}

.intro {
  padding: var(--gutter);
}

.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
}

.swatch {
  padding: var(--gutter);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gutter);
  padding-block: var(--space-sm-inline);
}
</style>
