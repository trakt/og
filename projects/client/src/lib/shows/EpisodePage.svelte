<script lang="ts">
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import NewCommentForm from '$lib/components/comments/NewCommentForm.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import ActivityTabs from '$lib/components/summary/ActivityTabs.svelte';
import ActorsStrip from '$lib/components/summary/ActorsStrip.svelte';
import AdditionalStat from '$lib/components/summary/AdditionalStat.svelte';
import AdditionalStats from '$lib/components/summary/AdditionalStats.svelte';
import CommentsPreview from '$lib/components/summary/CommentsPreview.svelte';
import EpisodeTitle from '$lib/components/summary/EpisodeTitle.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import ItemNav from '$lib/components/summary/ItemNav.svelte';
import LazySection from '$lib/components/summary/LazySection.svelte';
import ListsPreview from '$lib/components/summary/ListsPreview.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import NameList from '$lib/components/summary/NameList.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import SeasonLinks from '$lib/components/summary/SeasonLinks.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import { page } from '$app/state';
import { mediaSpoilers } from '$lib/settings/mediaSpoilers';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import Videos from '$lib/components/summary/Videos.svelte';
import { overlay } from '$lib/overlay/overlay';
import { browserSectionsClient } from '$lib/summary/browserSectionsClient';
import { countLabel } from '$lib/utils/countLabel';
import type { loadEpisode } from '$lib/shows/loadEpisode';
const { data }: { data: Awaited<ReturnType<typeof loadEpisode>> } = $props();
const episode = $derived(data.episode);
const facts = $derived(episode.facts);
const spoilers = $derived(
  mediaSpoilers({
    spoilers: data.user ? page.data.settings?.browsing?.spoilers : null,
    type: 'episode',
    watched: overlay.state('episode', episode.id).watched,
  }),
);
const safeTitle = $derived(spoilers.title ? `${episode.showTitle} ${episode.number}` : episode.fullTitle);
const ratingTarget = $derived({ type: 'episode' as const, id: episode.id, title: safeTitle });
const media = $derived({ ...ratingTarget, slug: episode.slug, season: episode.season, episode: episode.episodeNumber });
const lazy = () => browserSectionsClient(data.user !== null);
const sections = $derived([
  { label: 'Overview', href: '#overview' },
  { label: 'Activity', href: '#activity' },
  ...(episode.cast.length + episode.guestStars.length > 0
    ? [{ label: 'Actors', href: '#actors', more: { href: `${episode.href}/credits`, text: 'All cast & crew' } }]
    : []),
  {
    label: countLabel(episode.commentCount, 'Comment'),
    href: '#comments',
    more: { href: `${episode.href}/comments`, text: 'All comments' },
  },
  {
    label: countLabel(episode.listCount, 'List'),
    href: '#lists',
    more: { href: `${episode.href}/lists`, text: 'All lists' },
  },
]);
</script>
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{safeTitle} - Trakt</title>
  <meta name="description"
    content={!spoilers.overview && episode.overview || `Season ${episode.season}, Episode ${media.episode}`} />
  <meta property="og:type" content="video.episode" />
  <meta property="og:title" content={safeTitle} />
  <meta property="og:description" content={!spoilers.overview && episode.overview || safeTitle} />
  <meta property="og:image" content={spoilers.screenshot ? episode.fanart : episode.screenshot ?? episode.fanart} />
  <meta property="video:series" content={`https://og.trakt.tv${episode.showHref}`} />
</svelte:head>
<FanartHeader dropped={overlay.state('show',episode.showId).dropped} image={episode.fanart}
  screenshot={spoilers.screenshot ? undefined : episode.screenshot}>
  <EpisodeTitle target={ratingTarget} show={{title:episode.showTitle,href:episode.showHref}} season={{title:episode.seasonTitle,href:episode.seasonHref}} number={episode.number} title={episode.title} year={episode.year} certification={episode.certification} type={episode.type} />
  {#snippet stats()}<RatingsStrip rating={episode.rating} external={episode.external} rateLabel="episode" {ratingTarget} counts={episode.counts} />{/snippet}
  {#snippet edges()}<ItemNav previous={episode.previous} next={episode.next} up={episode.seasonHref} />{/snippet}
</FanartHeader>
<SummaryFrame label={safeTitle}>
  {#snippet subnav()}<SeasonLinks label="Episode" links={episode.episodeLinks} />{/snippet}
  {#snippet sidebar()}
    <a class="poster-link" href={episode.seasonHref} aria-label="Back to {episode.seasonTitle}"><SummaryPoster showTarget={{type:'show',id:episode.showId,title:episode.showTitle}} image={episode.poster} alt="{episode.showTitle}: {episode.seasonTitle}" {ratingTarget} /></a>
    <SectionNav {sections} label="{safeTitle} sections" />
    <ExternalLinks links={episode.links} />
  {/snippet}
  {#snippet tools()}<MediaTools target={{...ratingTarget,href:episode.href}} />{/snippet}
  {#snippet details()}
    <AdditionalStats>
      {#if facts.aired}<AdditionalStat label={facts.aired.label}>{facts.aired.date} {#if facts.network}on <NameList names={[facts.network]} />{/if}</AdditionalStat>{:else if facts.network}<AdditionalStat label="Network"><NameList names={[facts.network]} /></AdditionalStat>{/if}
      {#if facts.runtime}<AdditionalStat label="Runtime">{facts.runtime}</AdditionalStat>{/if}
      {#if facts.directors.length}<AdditionalStat label={facts.directors.length>1 ? 'Directors':'Director'}><NameList names={facts.directors} /></AdditionalStat>{/if}
      {#if facts.writers.length}<AdditionalStat label={facts.writers.length>1 ? 'Writers':'Writer'}><NameList names={facts.writers} collapse /></AdditionalStat>{/if}
      {#if facts.country}<AdditionalStat label="Country"><NameList names={[facts.country]} /></AdditionalStat>{/if}
      {#if facts.languages.length}<AdditionalStat label="Languages"><NameList names={facts.languages} /></AdditionalStat>{/if}
      {#if facts.genres.length}<AdditionalStat label="Genres"><NameList names={facts.genres} /></AdditionalStat>{/if}
      {#if facts.originalTitle}<AdditionalStat label="Original Title">{facts.originalTitle}</AdditionalStat>{/if}
      <AdditionalStat label="Links" phoneOnly><NameList names={episode.links.filter(({icon})=>!icon).map(({label,href})=>({name:label,href}))} /></AdditionalStat>
    </AdditionalStats>
    {#key episode.id}<MediaSpoiler target={ratingTarget} kind="overview"><Overview overview={episode.overview} /></MediaSpoiler>{/key}
    <Videos title={episode.fullTitle} {...episode.videos} />
  {/snippet}
  {#snippet actions()}<ActionButtons checkin={ratingTarget} listTarget={ratingTarget} historyTarget={{...ratingTarget,runtime:episode.runtime}} />{/snippet}
  {#key episode.href}
    <NewCommentForm item={{ ...ratingTarget, show: episode.showId, season: episode.season }} />
    <LazySection id="activity" load={()=>lazy().activity(media)}>{#snippet children(tabs)}<ActivityTabs {tabs} />{/snippet}</LazySection>
  {/key}
  <ActorsStrip groups={[{id:'season-regulars',label:'Season Regulars',cast:episode.cast},{id:'guest-stars',label:'Guest Stars',cast:episode.guestStars}]} creditsHref="{episode.href}/credits" />
  {#key episode.href}
    <LazySection id="comments" load={()=>lazy().comments(media)}>{#snippet children(tabs)}<CommentsPreview {tabs} item={{...ratingTarget,show:episode.showId,season:episode.season}} viewer={data.user ? {slug:data.user.slug}:null} count={episode.commentCount} href={episode.href} dateOptions={data.datePreferences} />{/snippet}</LazySection>
    <LazySection id="lists" load={()=>lazy().lists(media)}>{#snippet children(tabs)}<ListsPreview {tabs} count={episode.listCount} href={episode.href} />{/snippet}</LazySection>
  {/key}
</SummaryFrame>
<style>
.poster-link {
  display: block;
}
</style>
