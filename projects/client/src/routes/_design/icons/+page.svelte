<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import angleRight from '$lib/icons/light/angle-right.svg?raw';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import dolbyAtmos from '$lib/icons/logos/dolby_atmos.svg?raw';
import flag from '$lib/icons/regular/flag.svg?raw';
import gear from '$lib/icons/thin/gear.svg?raw';
import lockKeyhole from '$lib/icons/solid/lock-keyhole.svg?raw';
import traktLogomark from '$lib/icons/kit/trakt-logomark-circle-white.svg?raw';
import xTwitter from '$lib/icons/brands/x-twitter.svg?raw';

// One icon per family, each named the way OG's markup names it.
const icons = [
  { family: 'solid', name: 'lock-keyhole', og: 'fa-solid fa-lock-keyhole', svg: lockKeyhole },
  { family: 'regular', name: 'flag', og: 'fa-regular fa-flag', svg: flag },
  { family: 'light', name: 'angle-right', og: 'fa-light fa-angle-right', svg: angleRight },
  { family: 'thin', name: 'gear', og: 'fa-thin fa-gear', svg: gear },
  { family: 'brands', name: 'x-twitter', og: 'fa-brands fa-x-twitter', svg: xTwitter },
  {
    family: 'kit',
    name: 'trakt-logomark-circle-white',
    og: 'fa-kit fa-trakt-logomark-circle-white',
    svg: traktLogomark,
  },
  { family: 'trakt', name: 'check-thick', og: 'trakt-icon-check-thick', svg: checkThick },
  { family: 'logos', name: 'dolby_atmos', og: 'logos-icon-dolby_atmos', svg: dolbyAtmos },
];
</script>

<svelte:head>
  <title>Icons · og design system</title>
</svelte:head>

<main>
  <h1>Icons</h1>
  <p>
    Extracted from OG's fonts with <code>deno task icon &lt;family&gt; &lt;name&gt;</code>. Each icon sits on the text
    baseline and takes its size and color from the text around it.
  </p>

  <!-- Focusable so keyboard users can scroll it sideways on narrow screens. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-scroll" role="region" aria-label="Icons by family" tabindex="0">
    <table>
      <thead>
        <tr>
          <th scope="col">Family</th>
          <th scope="col">OG class</th>
          <th scope="col">In text</th>
          <th scope="col">Fixed width</th>
          <th scope="col">Large</th>
        </tr>
      </thead>
      <tbody>
      {#each icons as icon (icon.family)}
        <tr>
          <th scope="row">{icon.family}</th>
          <td><code>{icon.og}</code></td>
          <td class="in-text"><Icon svg={icon.svg} /> {icon.name}</td>
          <td class="in-text"><Icon svg={icon.svg} fixedWidth /> {icon.name}</td>
          <td class="large"><Icon svg={icon.svg} label={icon.name} /></td>
        </tr>
      {/each}
    </tbody>
    </table>
  </div>
</main>

<style>
/* Plain values until the 0.3a tokens land: 14px is OG's base font size, and the large column shows glyph detail. */
main {
  padding: 1rem;
  font-family: system-ui, sans-serif;
  font-size: 14px;
}

.table-scroll {
  overflow-x: auto;
}

table {
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem 1rem;
  text-align: start;
  border-block-end: 1px solid color-mix(in srgb, currentColor 20%, transparent);
}

.in-text {
  white-space: nowrap;
}

.large {
  font-size: 4rem;
}
</style>
