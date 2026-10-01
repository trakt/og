<script lang="ts">
import { resolve } from '$app/paths';
import Container from '$lib/components/container/Container.svelte';
import { overlay } from '$lib/overlay/overlay';

const colorGroups: Record<string, string[]> = {
  Grays: ['gray-darker', 'gray-dark', 'gray', 'gray-light', 'gray-lightish', 'gray-lighter'],
  Brand: [
    'brand-primary',
    'brand-primary-darken',
    'brand-secondary',
    'brand-tertiary',
    'brand-quaternary',
    'brand-fifth',
    'brand-sixth',
    'brand-seventh',
    'brand-eighth',
    'brand-success',
    'brand-info',
    'brand-warning',
    'brand-danger',
    'color-orange',
  ],
  Ratings: Array.from({ length: 10 }, (_, i) => `rating-${i + 1}`),
  'Episode types': [
    'episode-series-premiere',
    'episode-season-premiere',
    'episode-mid-season-premiere',
    'episode-mid-season-finale',
    'episode-season-finale',
    'episode-series-finale',
    'episode-bonus',
    'episode-trailer',
  ],
  'Themed (flip with dark mode)': [
    'color-page',
    'color-surface',
    'color-box',
    'color-text',
    'color-text-muted',
    'color-link',
    'color-link-hover',
    'color-separator',
    'color-input-bg',
    'color-input-text',
    'color-input-border',
  ],
};

const spaces = ['xs', 'sm', 'base', 'lg'];
const shadows = ['shadow-dropdown', 'shadow-input-focus', 'shadow-soft'];

let overlayType = $state<'movie' | 'show' | 'season' | 'episode'>('movie');
let overlayId = $state(1);
const overlayState = $derived(
  JSON.stringify(overlay.state(overlayType, overlayId), (_, value) => value === undefined ? 'unknown' : value, 2),
);

let theme = $state('light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Design system: og</title>
</svelte:head>

<main>
  <section>
    <Container>
      <h1>Design system</h1>
      <p>Tokens and base element styles from OG. Every value here is a custom property in <code>$lib/styles/tokens.css</code>.</p>
      <p>This column is <code>Container</code>: OG's page width, 1160px at a 1440px viewport. Resize to see 740, 960 and 1560.</p>
      <label>
        Theme
        <select bind:value={theme}>
          <option value="light">Light (OG default)</option>
          <option value="dark">Dark (dark knight)</option>
          <option value="system">System</option>
        </select>
      </label>

      <div>
        <h2>Type: heading 2, 24px Montserrat 400 with <b>bold</b></h2>
        <p>The page title above is the h1: 34px Montserrat 600 (OG used Proxima Nova).</p>
        <h3>Heading 3, 24px</h3>
        <h4>Heading 4, 18px</h4>
        <h5>Heading 5, 14px</h5>
        <h6>Heading 6, 12px</h6>
        <p>
          Body copy is 14px Varela Round on a 20px line. Breaking Bad follows Walter White, a chemistry teacher who
          turns to making meth after a cancer diagnosis. <a href={resolve('/_design')}>A link</a>, <strong>strong text</strong>
          and <small>small text</small>.
        </p>
        <p>A second paragraph shows the 10px paragraph margin.</p>
        <hr />
      </div>

      <h2>Colors</h2>
      {#each Object.entries(colorGroups) as [group, names] (group)}
        <h3>{group}</h3>
        <ul class="swatches">
          {#each names as name (name)}
            <li>
              <span class="chip" style:background-color="var(--{name})"></span>
              <code>--{name}</code>
            </li>
          {/each}
        </ul>
      {/each}

      <h2>Spacing and controls</h2>
      <ul class="spaces">
        {#each spaces as size (size)}
          <li>
            <span
              class="pad"
              style:padding="var(--space-{size}-block) var(--space-{size}-inline)"
            >--space-{size}</span>
          </li>
        {/each}
        <li><span class="gutter"></span> <code>--gutter</code></li>
      </ul>
      <form class="controls" onsubmit={(e) => e.preventDefault()}>
        <label>Text <input type="text" placeholder="Search shows, movies, people" /></label>
        <label>Select <select><option>Trending</option><option>Popular</option></select></label>
        <label>Disabled <input type="text" value="Disabled" disabled /></label>
        <button type="button">Button</button>
      </form>
      <label class="textarea">Textarea <textarea rows="3"></textarea></label>

      <h2>Shadows and images</h2>
      <ul class="shadows">
        {#each shadows as name (name)}
          <li style:box-shadow="var(--{name})"><code>--{name}</code></li>
        {/each}
      </ul>
      <div class="ratios">
        <div class="poster"><code>--ratio-poster</code></div>
        <div class="fanart"><code>--ratio-fanart</code></div>
      </div>

      <h2>Overlay state</h2>
      <p>The signed-in user's state for one item, from <code>$lib/overlay/overlay</code>. Signed out, every field is unknown.</p>
      <form class="controls" onsubmit={(e) => e.preventDefault()}>
        <label>
          Type
          <select bind:value={overlayType}>
            <option value="movie">Movie</option>
            <option value="show">Show</option>
            <option value="season">Season</option>
            <option value="episode">Episode</option>
          </select>
        </label>
        <label>Trakt id <input type="number" min="1" bind:value={overlayId} /></label>
      </form>
      <pre aria-live="polite">{overlayState}</pre>
    </Container>
  </section>
</main>

<style>
section {
  padding-block: var(--gutter) calc(var(--gutter) * 2);
}

.swatches,
.spaces,
.shadows {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gutter);
  margin: var(--space-lg-block) 0 0;
  padding: 0;
  list-style: none;
}

.swatches li {
  display: grid;
  justify-items: start;
  gap: var(--space-sm-block);
  inline-size: 180px;
}

.chip {
  display: block;
  inline-size: 100%;
  block-size: 48px;
  border: 1px solid var(--color-separator);
}

.pad {
  display: inline-block;
  background-color: var(--gray-lightish);
  color: var(--gray-darker);
}

.gutter {
  display: inline-block;
  inline-size: var(--gutter);
  block-size: var(--gutter);
  background-color: var(--gray-lightish);
  vertical-align: middle;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--gutter);
  margin-block-start: var(--gutter);
}

label {
  display: inline-grid;
  gap: var(--space-sm-block);
}

.textarea {
  display: grid;
  margin-block-start: var(--gutter);
  max-inline-size: 480px;
}

.shadows li {
  padding: var(--space-lg-block) var(--space-lg-inline);
  background-color: var(--color-box);
}

.ratios {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  gap: var(--gutter);
  margin-block-start: var(--gutter);

  & div {
    display: grid;
    place-content: center;
    background-color: var(--gray-dark);
    color: var(--gray-lighter);
  }
}

.poster {
  inline-size: 160px;
  aspect-ratio: var(--ratio-poster);
}

.fanart {
  inline-size: 480px;
  max-inline-size: 100%;
  aspect-ratio: var(--ratio-fanart);
}
</style>
