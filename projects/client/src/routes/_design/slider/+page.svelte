<!--
  The fanart slider on its own: discover's "Top ... Last Week" layout with rank pills and keys, and the bare one the
  Summer TV Shows showcase uses. OG's version is at the top of https://og-shots.trakt.tv/128/2b493502-discover-1440-fold.png.
-->
<script lang="ts">
import Header from '$lib/components/header/Header.svelte';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import FanartSlider from '$lib/components/slider/FanartSlider.svelte';

// No artwork: media.trakt.tv refuses a localhost referer, so the slides show the bare behind the shade.
const fanarts = Array.from({ length: 10 }, () => undefined);
</script>

<svelte:head>
  <title>Fanart slider · og design system</title>
</svelte:head>

<Header user={null} />

<main>
  <section class="intro">
    <h1>Fanart slider</h1>
    <p>
      OG's <code>.popular-items-wrapper</code>. The chevrons wrap around; with <code>ranks</code> the pills pick a
      slide, and with <code>keys</code> <kbd>p</kbd> or left and <kbd>n</kbd> or right step through it while focus is
      inside.
    </p>
  </section>

  <div class="sliders">
    <FanartSlider title="Top TV Shows Last Week" {fanarts} ranks keys>
      {#snippet action()}<SeeMore href="/shows/watched" />{/snippet}
      {#snippet slide(index)}<p class="content">Slide {index + 1}</p>{/snippet}
    </FanartSlider>
    <FanartSlider title="Summer TV Shows" fanarts={fanarts.slice(0, 4)}>
      {#snippet action()}<SeeMore href="/calendars/premieres/2025-06-01" text="All Premieres" />{/snippet}
      {#snippet slide(index)}<p class="content">Slide {index + 1} of 4</p>{/snippet}
    </FanartSlider>
  </div>
</main>

<style>
main {
  padding-block-start: var(--header-height);
}

.intro {
  padding: var(--gutter);
}

.sliders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.content {
  font-family: var(--font-headings);
  font-size: var(--font-size-h2);
}
</style>
