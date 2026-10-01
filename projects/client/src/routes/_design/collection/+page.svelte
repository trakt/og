<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import WatchPopover from '$lib/components/history/WatchPopover.svelte';
import CollectionMetadataFields from '$lib/components/collection/CollectionMetadataFields.svelte';
import type { CollectionMetadata } from '$lib/components/collection/CollectionMetadata';
import { toast } from '$lib/components/toast/toast.svelte';
import Icon from '$lib/icons/Icon.svelte';
import collection from '$lib/icons/trakt/collection.svg?raw';
const dates = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const examples = [
  { label: 'Add to library', mode: 'date', fill: 0 },
  { label: 'In Library', mode: 'remove', fill: 1 },
  { label: '50% in library', mode: 'partial', fill: 0.5 },
] as const;
let draft = $state<CollectionMetadata>({ media_type: 'bluray', resolution: 'hd_1080p' });
</script>
<svelte:head>
  <title>Collection controls · og design system</title>
</svelte:head>
<Container>
  <section>
    <h1>Library controls</h1>
    <p>Optional metadata, date choices, removal and remaining episodes.</p>
    {#each examples as example (example.mode)}
      <h2>{example.mode}</h2>
      <div class="example">
        <WatchPopover collection label={example.label} variant="summary" fill={example.fill} plural={example.mode === 'partial'} datePreferences={dates}
          onopen={(force) => Promise.resolve(force ? 'date' : example.mode)} onwatch={(at) => toast.success(at === null ? 'Removed from library.' : `Collected: ${at}`)} onremaining={() => Promise.resolve(false)} oninvalid={() => toast.error('Choose a valid date.')}>
          {#snippet trigger()}<Icon svg={collection} /> {example.label}{/snippet}
          {#snippet metadata(done, saving)}<CollectionMetadataFields value={draft} {saving} onsave={(value) => { draft = value; done(); }} />{/snippet}
        </WatchPopover>
      </div>
    {/each}
    <h2>Poster library icon</h2>
    <WatchPopover collection label="Add to library" datePreferences={dates} onopen={() => Promise.resolve('date')} onwatch={(at) => toast.success(`Collected: ${at}`)} onremaining={() => Promise.resolve(false)} oninvalid={() => toast.error('Choose a valid date.')}>
      {#snippet trigger()}<Icon svg={collection} />{/snippet}
      {#snippet metadata(done, saving)}<CollectionMetadataFields value={draft} {saving} onsave={(value) => { draft = value; done(); }} />{/snippet}
    </WatchPopover>
  </section>
</Container>
<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
.example {
  max-inline-size: var(--collection-metadata-width);
}
</style>
