<!--
  The show's facts, overview and videos: the `details` column of every show page's SummaryFrame (summary, seasons,
  all episodes). OG's `ul.additional-stats`, `#overview` and the notes/videos box.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import AdditionalStat from '$lib/components/summary/AdditionalStat.svelte';
import AdditionalStats from '$lib/components/summary/AdditionalStats.svelte';
import NameList from '$lib/components/summary/NameList.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import PrivateNotes from '$lib/components/summary/PrivateNotes.svelte';
import Videos from '$lib/components/summary/Videos.svelte';
import type { ComponentProps } from 'svelte';
import type { toShowSummary } from './toShowSummary.ts';

interface Props {
  show: ReturnType<typeof toShowSummary>;
  privateNotes: ComponentProps<typeof PrivateNotes>;
}

const { show, privateNotes }: Props = $props();
const facts = $derived(show.facts);
const textLinks = $derived(show.links.filter(({ icon }) => !icon));
</script>

{#snippet network(link: { name: string; href?: string } | undefined)}
  {#if link}on <NameList names={[link]} />{/if}
{/snippet}

<AdditionalStats>
  {#if facts.status}
    <AdditionalStat label={facts.status.label}>{facts.status.value}</AdditionalStat>
  {/if}
  {#if facts.premieres}
    <AdditionalStat label="Premieres">{facts.premieres.date} {@render network(facts.premieres.network)}</AdditionalStat>
  {/if}
  {#if facts.airs}
    <AdditionalStat label="Airs">{facts.airs.when} {@render network(facts.airs.network)}</AdditionalStat>
  {/if}
  {#if facts.network}
    <AdditionalStat label="Network"><NameList names={[facts.network]} /></AdditionalStat>
  {/if}
  {#if facts.premiered}
    <AdditionalStat label="Premiered">{facts.premiered}</AdditionalStat>
  {/if}
  {#if facts.runtime}
    <AdditionalStat label="Runtime">{facts.runtime}</AdditionalStat>
  {/if}
  {#if facts.totalRuntime}
    <AdditionalStat label="Total Runtime">
      {facts.totalRuntime.time}
      {#if facts.totalRuntime.episodes}<span class="alt">({facts.totalRuntime.episodes})</span>{/if}
    </AdditionalStat>
  {/if}
  {#if facts.creators.length > 0}
    <AdditionalStat label={facts.creators.length === 1 ? 'Creator' : 'Creators'}>
      <NameList names={facts.creators} collapse />
    </AdditionalStat>
  {/if}
  {#if facts.country}
    <AdditionalStat label="Country"><NameList names={[facts.country]} /></AdditionalStat>
  {/if}
  {#if facts.languages.length > 0}
    <AdditionalStat label="Languages"><NameList names={facts.languages} /></AdditionalStat>
  {/if}
  {#if facts.studios.length > 0}
    <AdditionalStat label={facts.studios.length === 1 ? 'Studio' : 'Studios'}>
      <NameList names={facts.studios} collapse />
    </AdditionalStat>
  {/if}
  {#if facts.genres.length > 0}
    <AdditionalStat label="Genres"><NameList names={facts.genres} /></AdditionalStat>
  {/if}
  {#if facts.originalTitle}
    <AdditionalStat label="Original Title">{facts.originalTitle}</AdditionalStat>
  {/if}
  {#if textLinks.length > 0}
    <AdditionalStat label="Links" phoneOnly>
      <NameList names={textLinks.map(({ label, href }) => ({ name: label.replace(' Site', ''), href }))} />
    </AdditionalStat>
  {/if}
</AdditionalStats>
<MediaSpoiler target={{type:"show",id:show.id}} kind="overview">
  <Overview tagline={show.tagline} overview={show.overview} />
</MediaSpoiler>
<PrivateNotes {...privateNotes} />
<Videos title={show.fullTitle} trailer={show.trailer} />

<style>
.alt {
  color: var(--color-summary-alt);
  font-style: italic;
}
</style>
