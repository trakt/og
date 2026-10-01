<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import NewCommentForm from '$lib/components/comments/NewCommentForm.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import ActivityTabs from '$lib/components/summary/ActivityTabs.svelte';
import ActorsStrip from '$lib/components/summary/ActorsStrip.svelte';
import AdditionalStat from '$lib/components/summary/AdditionalStat.svelte';
import AdditionalStats from '$lib/components/summary/AdditionalStats.svelte';
import CommentsPreview from '$lib/components/summary/CommentsPreview.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import ItemNav from '$lib/components/summary/ItemNav.svelte';
import LazySection from '$lib/components/summary/LazySection.svelte';
import ListsPreview from '$lib/components/summary/ListsPreview.svelte';
import NameList from '$lib/components/summary/NameList.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import SeasonLinks from '$lib/components/summary/SeasonLinks.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import Videos from '$lib/components/summary/Videos.svelte';
import SummaryTitle from '$lib/components/summary/SummaryTitle.svelte';
import { browserSectionsClient } from '$lib/summary/browserSectionsClient';
import { countLabel } from '$lib/utils/countLabel';
import EpisodeList from '$lib/shows/EpisodeList.svelte';
import type { loadSeason } from '$lib/shows/loadSeason';

const { data }: { data: Awaited<ReturnType<typeof loadSeason>> } = $props();
const season = $derived(data.season);
const facts = $derived(season.facts);
const ratingTarget = $derived({
  type: 'season' as const,
  id: season.id,
  title: season.fullTitle,
  season: { show: season.showId, number: season.number },
});
const media = $derived({
  ...ratingTarget,
  slug: season.showHref.split('/').at(-1) ?? '',
  season: season.number,
  airedEpisodes: season.airedEpisodes,
});
const lazy = () => browserSectionsClient(data.user !== null);
const sections = $derived([
  { label: 'Overview', href: '#overview' },
  { label: 'Activity', href: '#activity' },
  ...(season.cast.length + season.guestStars.length > 0
    ? [{ label: 'Actors', href: '#actors', more: { href: `${season.href}/credits`, text: 'All cast & crew' } }]
    : []),
  { label: countLabel(season.episodes.length, 'Episode'), href: '#episodes' },
  {
    label: countLabel(season.commentCount, 'Comment'),
    href: '#comments',
    more: { href: `${season.href}/comments`, text: 'All comments' },
  },
  {
    label: countLabel(season.listCount, 'List'),
    href: '#lists',
    more: { href: `${season.href}/lists`, text: 'All lists' },
  },
]);
</script>
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:head>
  <title>{season.fullTitle} - Trakt</title>
  <meta name="description" content={season.overview ?? season.fullTitle} />
</svelte:head>

<FanartHeader image={season.fanart}>
  <SummaryTitle title={season.title} year={season.years} certification={season.certification} parent={{ href: season.showHref, title: season.parentTitle }} />
  {#snippet stats()}<RatingsStrip rating={season.rating} rateLabel="season" {ratingTarget} counts={season.counts} />{/snippet}
  {#snippet edges()}<ItemNav previous={season.previous} next={season.next} up={season.showHref} />{/snippet}
</FanartHeader>
<SummaryFrame label={season.fullTitle}>
  {#snippet subnav()}<SeasonLinks label="Season" links={season.seasonLinks} />{/snippet}
  {#snippet sidebar()}
    <a class="poster-link" href={season.showHref} aria-label="Back to {season.showTitle}"><SummaryPoster {ratingTarget} image={season.poster} alt={season.fullTitle} /></a>
    <SectionNav {sections} label="{season.fullTitle} sections" />
    <ExternalLinks links={season.links} />
  {/snippet}
  {#snippet details()}
    <AdditionalStats>
      {#if facts.premiere}<AdditionalStat label={facts.premiere.label}>{facts.premiere.date} {#if facts.network}on <NameList names={[facts.network]} />{/if}</AdditionalStat>
      {:else if facts.network}<AdditionalStat label="Network"><NameList names={[facts.network]} /></AdditionalStat>{/if}
      {#if facts.runtime}<AdditionalStat label="Runtime">{facts.runtime}</AdditionalStat>{/if}
      {#if facts.totalRuntime}<AdditionalStat label="Total Runtime">{facts.totalRuntime.time} <span class="alt">({facts.totalRuntime.episodes})</span></AdditionalStat>{/if}
      {#if facts.country}<AdditionalStat label="Country"><NameList names={[facts.country]} /></AdditionalStat>{/if}
      {#if facts.languages.length}<AdditionalStat label="Languages"><NameList names={facts.languages} /></AdditionalStat>{/if}
      {#if facts.genres.length}<AdditionalStat label="Genres"><NameList names={facts.genres} /></AdditionalStat>{/if}
      <AdditionalStat label="Links" phoneOnly><NameList names={season.links.filter(({ icon }) => !icon).map(({ label, href }) => ({ name: label, href }))} /></AdditionalStat>
    </AdditionalStats>
    <MediaSpoiler target={ratingTarget} kind="overview"><Overview overview={season.overview} /></MediaSpoiler>
    <Videos title={season.fullTitle} trailer={season.trailer} />
  {/snippet}
  {#snippet actions()}<ActionButtons listTarget={ratingTarget} historyTarget={{ ...ratingTarget, season: { show: season.showId, number: season.number }, airedEpisodes: season.airedEpisodes, episodeIds: season.episodeIds, runtime: season.runtime }} />{/snippet}
  {#key season.href}
    <NewCommentForm item={{ type: 'season', id: season.id, title: season.fullTitle, show: season.showId, number: season.number, airedEpisodes: season.airedEpisodes }} />
    <LazySection id="activity" load={() => lazy().activity(media)}>{#snippet children(tabs)}<ActivityTabs {tabs} />{/snippet}</LazySection>
  {/key}
  <ActorsStrip groups={[{ id: 'season-regulars', label: 'Season Regulars', cast: season.cast }, { id: 'guest-stars', label: 'Guest Stars', cast: season.guestStars }]} creditsHref="{season.href}/credits" />
  {#key `${season.href}?${data.sort}&${data.terms}`}
    <EpisodeList showId={season.showId} signedIn={!!data.user} initialFilters={data.filters} rows={season.episodes} datePreferences={data.datePreferences} season search vip={data.user?.isVip ?? false} initialTerms={data.terms} initialSort={data.sort} />
  {/key}
  {#key season.href}
    <LazySection id="comments" load={() => lazy().comments(media)}>
      {#snippet children(tabs)}<CommentsPreview {tabs} item={{ type: 'season', id: season.id, title: season.fullTitle, show: season.showId, number: season.number, airedEpisodes: season.airedEpisodes }} viewer={data.user ? { slug: data.user.slug } : null} count={season.commentCount} href={season.href} dateOptions={data.datePreferences} />{/snippet}
    </LazySection>
    <LazySection id="lists" load={() => lazy().lists(media)}>{#snippet children(tabs)}<ListsPreview {tabs} count={season.listCount} href={season.href} />{/snippet}</LazySection>
  {/key}
</SummaryFrame>

<style>
.poster-link {
  display: block;
}
.alt {
  color: var(--color-summary-alt);
  font-style: italic;
}
</style>
