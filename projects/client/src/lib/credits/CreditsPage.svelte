<!--
  The cast and crew page of a movie, show, season or episode: the subpage frame,
  then an "Actors" and a "Crew" section, each a row of pill tabs over a five-column grid of headshots.
-->
<script lang="ts">
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import SubpageFrame from '$lib/components/summary/SubpageFrame.svelte';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import friends from '$lib/icons/trakt/friends-thick.svg?raw';
import type { loadCredits } from './loadCredits.ts';

const { data }: { data: Awaited<ReturnType<typeof loadCredits>> } = $props();
const title = $derived(`Cast & Crew for ${data.media.item.title}`);
const groups = $derived(
  [
    { key: 'actors', label: 'Actors', tabs: data.credits.actors },
    { key: 'crew', label: 'Crew', tabs: data.credits.crew },
  ].filter(({ tabs }) => tabs.length > 0),
);
const sections = $derived(groups.map(({ key, label }) => ({ label, href: `#${key}` })));
// The overlay has no people yet, so their list icon starts empty.
const fill = quickIconFill({ state: {} });
</script>

<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content={title} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={title} />
  {#if data.media.poster}<meta property="og:image" content={data.media.poster} />{/if}
</svelte:head>

<SubpageFrame {...data} label="Cast & Crew for..." icon={friends} {sections}>
  {#each groups as { key, label, tabs } (key)}
    <section id={key} aria-labelledby="{key}-heading">
      <h2 id="{key}-heading">{label}</h2>
      <!-- A new item starts on its first tab, like OG. -->
      {#key data.media.href}
        <PillTabs {label} {tabs}>
          {#snippet panel(id)}
            <PosterGrid columns={5}>
              {#each tabs.find((tab) => tab.id === id)?.people ?? [] as person, i (i)}
                <PosterCard
                  href={person.href}
                  title={person.name}
                  image={person.image}
                  subtitles={[person.role || '\u00a0', ...(person.episodes ? [person.episodes] : [])]}
                  icons={{
                    fill,
                    listOnly: true,
                    listTarget: { type: 'person', id: person.id, title: person.name },
                    listLabel: 'Add to list',
                  }}
                />
              {/each}
            </PosterGrid>
          {/snippet}
        </PillTabs>
      {/key}
    </section>
  {/each}
</SubpageFrame>

<style>
h2 {
  margin: 0;
}
</style>
