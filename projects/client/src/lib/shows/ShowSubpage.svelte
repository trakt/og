<!--
  The frame of a show's seasons pages: the show's fanart with its
  title as the level-up line over `heading`, the season subnav, the summary sidebar with its own sections, the show's
  facts and action buttons, then `children` underneath.
-->
<script lang="ts">
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import ItemNav from '$lib/components/summary/ItemNav.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import SeasonLinks from '$lib/components/summary/SeasonLinks.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import SummaryTitle from '$lib/components/summary/SummaryTitle.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import type { WatchNowButton } from '$lib/components/watchnow/watchNow';
import type { ComponentProps, Snippet } from 'svelte';
import ShowDetails from './ShowDetails.svelte';
import type { toShowSummary } from './toShowSummary.ts';

interface Props {
  show: ReturnType<typeof toShowSummary>;
  watchNow: WatchNowButton;
  privateNotes: ComponentProps<typeof ShowDetails>['privateNotes'];
  /** The h1: "Original Air Date", "All Episodes". */
  heading: string;
  years?: string;
  seasonLinks: ComponentProps<typeof SeasonLinks>;
  sections: ComponentProps<typeof SectionNav>['sections'];
  previous?: ComponentProps<typeof ItemNav>['previous'];
  next?: ComponentProps<typeof ItemNav>['next'];
  children: Snippet;
}

const { show, watchNow, privateNotes, heading, years, seasonLinks, sections, previous, next, children }: Props =
  $props();
const ratingTarget = $derived({ type: 'show' as const, id: show.id, title: show.fullTitle });
</script>

<svelte:head>
  <title>{show.fullTitle}: {heading} - Trakt</title>
  <meta name="description" content={show.overview ?? show.fullTitle} />
</svelte:head>

<FanartHeader image={show.fanart}>
  <SummaryTitle
    title={heading}
    year={years}
    certification={show.certification}
    parent={{ href: show.href, title: show.title }}
  />
  {#snippet stats()}
    <RatingsStrip rating={show.rating} rateLabel="show" {ratingTarget} external={show.external} counts={show.counts} />
  {/snippet}
  {#snippet edges()}
    <ItemNav {previous} {next} up={show.href} />
  {/snippet}
</FanartHeader>

<SummaryFrame label={show.title}>
  {#snippet subnav()}
    <SeasonLinks {...seasonLinks} />
  {/snippet}

  {#snippet tools()}
    <MediaTools target={{ type: 'show', id: show.id, title: show.title, href: show.href, tmdb: show.links.find((link) => link.label === 'TMDB')?.href }} updatedAt={show.updatedAt} />
  {/snippet}

  {#snippet sidebar()}
    <SummaryPoster {ratingTarget} image={show.poster} alt={show.fullTitle} />
    <WatchNow button={watchNow} title={show.title} year={show.year} fanart={show.fanart} />
    <SectionNav {sections} label="{show.title} sections" />
    <ExternalLinks links={show.links} />
  {/snippet}

  {#snippet details()}
    <ShowDetails {show} {privateNotes} />
  {/snippet}

  {#snippet actions()}
    <WatchNow button={watchNow} title={show.title} year={show.year} fanart={show.fanart} phone />
    <ActionButtons favorites favoriteTarget={{ ...ratingTarget, title: show.title, year: show.year, fanart: show.fanart }} historyTarget={{ ...ratingTarget, airedEpisodes: show.airedEpisodes, runtime: show.runtime, episodeIds: show.episodeIds }} />
  {/snippet}

  {@render children()}
</SummaryFrame>
