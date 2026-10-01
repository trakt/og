<script lang="ts">
import NoData from '$lib/components/empty/NoData.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import SubpageTitle from '$lib/components/summary/SubpageTitle.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import CountryHeading from '$lib/components/table/CountryHeading.svelte';
import DataPanel from '$lib/components/table/DataPanel.svelte';
import calendar from '$lib/icons/trakt/calendar.svg?raw';
import type { loadMovieReleases } from '$lib/movies/loadMovieReleases';

const { data }: { data: Awaited<ReturnType<typeof loadMovieReleases>> } = $props();
const movie = $derived(data.movie);
</script>

<!-- The movie link is the canonical API slug. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>Release dates for {movie.fullTitle} - Trakt</title>
  <meta name="description" content={movie.overview ?? `Release dates for ${movie.fullTitle}.`} />
</svelte:head>

<FanartHeader image={movie.fanart} slim>
  <SubpageTitle label="Release dates for..." icon={calendar} title={movie.title} year={movie.year} href={movie.href} />
</FanartHeader>
<SummaryFrame label={movie.title} fullWidth>
  {#snippet tools()}
    <MediaTools target={{ type: 'movie', id: movie.id, title: movie.fullTitle, href: movie.href, tmdb: movie.links.find((link) => link.label === 'TMDB')?.href }} updatedAt={movie.updatedAt} datasource="TMDB" />
  {/snippet}

  {#snippet sidebar()}
    <a href={movie.href}><SummaryPoster image={movie.poster} alt={movie.fullTitle} /></a>
    <WatchNow button={data.watchNow} title={movie.title} year={movie.year} fanart={movie.fanart} />
    <ExternalLinks links={movie.links} />
  {/snippet}
  {#snippet details()}
    {#each data.countries as country (country.code)}
      <DataPanel label={`${country.name} release dates`}>
        {#snippet heading()}<CountryHeading {...country} />{/snippet}
        <table aria-label={`${country.name} release dates`}>
          <thead><tr><th scope="col">Date</th><th scope="col">Certification</th><th scope="col">Type</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {#each country.rows as row, i (i)}
              <tr><td><time datetime={row.date}>{row.dateText}</time></td><td>{row.certification}</td><td>{row.type}{#if row.qualifier}<em>{` ${row.qualifier}`}</em>{/if}</td><td>{row.note}</td></tr>
            {/each}
          </tbody>
        </table>
      </DataPanel>
    {:else}
      <NoData>No release dates yet.</NoData>
    {/each}
  {/snippet}
</SummaryFrame>
