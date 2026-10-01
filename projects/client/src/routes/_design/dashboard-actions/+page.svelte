<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import OnDeckCard from '$lib/components/media/OnDeckCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { toOnDeckItem } from '$lib/progress/toOnDeckItem';
import { upNextFixture } from '$lib/progress/upNextFixture';

const entry = upNextFixture.entries.at(0);
const sample = entry ? toOnDeckItem({ entry, username: 'me' }) : undefined;
let needsRefresh = $state(true);
</script>

<svelte:head>
  <title>Dashboard action states - Trakt</title>
</svelte:head>
<main>
  <Container>
    <h1>Dashboard action states</h1>
    <p>Next Episode, refreshing, a completed returning show and an ended show. The Next Episode cover is keyboard operable.</p>
    {#if sample}
      <PosterGrid columns={6}>
        <OnDeckCard item={sample} {needsRefresh} onRefresh={() => { needsRefresh = false; }} />
        <OnDeckCard item={sample} refreshing />
        <OnDeckCard item={{ ...sample, complete: true, completionLabel: 'Returns next season!', progress: { ...sample.progress, completed: sample.progress.aired } }} />
        <OnDeckCard item={{ ...sample, complete: true, completionLabel: 'Ended', progress: { ...sample.progress, completed: sample.progress.aired } }} />
      </PosterGrid>
    {/if}
  </Container>
</main>

<style>
main {
  display: flow-root;
  min-block-size: 100vh;
  background: var(--color-panel-gray);
  color: var(--color-text);
}
</style>
