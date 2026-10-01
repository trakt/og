<!-- The movie summary (`/movies/:id`): the media frame filled with one movie. -->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import NewCommentForm from '$lib/components/comments/NewCommentForm.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import ActivityTabs from '$lib/components/summary/ActivityTabs.svelte';
import ActorsStrip from '$lib/components/summary/ActorsStrip.svelte';
import CommentsPreview from '$lib/components/summary/CommentsPreview.svelte';
import AdditionalStat from '$lib/components/summary/AdditionalStat.svelte';
import AdditionalStats from '$lib/components/summary/AdditionalStats.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import ItemNav from '$lib/components/summary/ItemNav.svelte';
import LazySection from '$lib/components/summary/LazySection.svelte';
import ListsPreview from '$lib/components/summary/ListsPreview.svelte';
import NameList from '$lib/components/summary/NameList.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import PrivateNotes from '$lib/components/summary/PrivateNotes.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import RelatedItems from '$lib/components/summary/RelatedItems.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import SummaryTitle from '$lib/components/summary/SummaryTitle.svelte';
import Videos from '$lib/components/summary/Videos.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { browserSectionsClient } from '$lib/summary/browserSectionsClient';
import { countLabel } from '$lib/utils/countLabel';
import { formatDate } from '$lib/utils/formatDate';
import { formatRuntime } from '$lib/utils/formatRuntime';
import type { loadMovie } from './loadMovie.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadMovie>> & { user: HeaderUser | null; datePreferences: DatePreferences };
};

const { data }: Props = $props();
const movie = $derived(data.movie);
const ratingTarget = $derived({ type: 'movie' as const, id: movie.id, title: movie.fullTitle });
const facts = $derived(movie.facts);
const media = $derived({ type: 'movie' as const, id: movie.id, slug: movie.slug, title: movie.fullTitle });
const lazy = () => browserSectionsClient(data.user !== null);

// Release dates are calendar days, so they format in UTC or they'd slip a day west of Greenwich.
const day = (date: string) => formatDate(date, { ...data.datePreferences, format: 'LL', timeZone: 'UTC' });

const sections = $derived([
  { label: 'Overview', href: '#overview' },
  { label: 'Activity', href: '#activity' },
  ...(movie.cast.length > 0
    ? [{ label: 'Actors', href: '#actors', more: { href: `${movie.href}/credits`, text: 'All cast & crew' } }]
    : []),
  {
    label: countLabel(movie.commentCount, 'Comment'),
    href: '#comments',
    more: { href: `${movie.href}/comments`, text: 'All comments' },
  },
  {
    label: countLabel(movie.listCount, 'List'),
    href: '#lists',
    more: { href: `${movie.href}/lists`, text: 'All lists' },
  },
]);
const textLinks = $derived(movie.links.filter(({ icon }) => !icon));
</script>

<svelte:head>
  <title>{movie.fullTitle} - Trakt</title>
  {#if movie.overview}<meta name="description" content={movie.overview} />{/if}
</svelte:head>

<!-- Hrefs are built from API slugs, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<FanartHeader image={movie.fanart}>
  <SummaryTitle
    title={movie.title}
    year={movie.year}
    certification={movie.certification}
    parent={movie.collection ?? undefined}
  />
  {#snippet stats()}
    <RatingsStrip rating={movie.rating} rateLabel="movie" {ratingTarget} external={movie.external} counts={movie.counts} />
  {/snippet}
  {#snippet edges()}
    <ItemNav previous={movie.collection?.previous} next={movie.collection?.next} up={movie.collection?.href} />
  {/snippet}
</FanartHeader>

<SummaryFrame label={movie.title}>
  {#snippet tools()}
    <MediaTools target={{ type: 'movie', id: movie.id, title: movie.fullTitle, href: movie.href, tmdb: movie.links.find((link) => link.label === 'TMDB')?.href }} updatedAt={movie.updatedAt} datasource="TMDB" />
  {/snippet}

  {#snippet sidebar()}
    <SummaryPoster {ratingTarget} image={movie.poster} alt={movie.fullTitle} />
    <WatchNow button={data.watchNow} title={movie.title} year={movie.year} fanart={movie.fanart} />
    <SectionNav {sections} label="{movie.title} sections" />
    <ExternalLinks links={movie.links} />
  {/snippet}

  {#snippet details()}
    <AdditionalStats>
      {#if facts.status}
        <AdditionalStat label="Status">{facts.status}</AdditionalStat>
      {/if}
      {#if facts.released}
        <AdditionalStat label={facts.released.upcoming ? 'Premieres' : 'Released'}>
          {day(facts.released.date)}
          {#if facts.released.more > 0}
            <a href="{movie.href}/releases">+ {facts.released.more} more</a>
          {/if}
        </AdditionalStat>
      {/if}
      {#if facts.dvd}
        <AdditionalStat label="DVD">{day(facts.dvd)}</AdditionalStat>
      {/if}
      {#if facts.runtime}
        <AdditionalStat label="Runtime">{formatRuntime(facts.runtime)}</AdditionalStat>
      {/if}
      {#if facts.directors.length > 0}
        <AdditionalStat label={facts.directors.length === 1 ? 'Director' : 'Directors'}>
          <NameList names={facts.directors} />
        </AdditionalStat>
      {/if}
      {#if facts.writers.length > 0}
        <AdditionalStat label={facts.writers.length === 1 ? 'Writer' : 'Writers'}>
          <NameList names={facts.writers} collapse />
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
    <MediaSpoiler target={ratingTarget} kind="overview"><Overview tagline={movie.tagline} overview={movie.overview} /></MediaSpoiler>
    <PrivateNotes {...data.privateNotes} />
    <Videos title={movie.fullTitle} {...movie.videos} />
  {/snippet}

  {#snippet actions()}
    <WatchNow button={data.watchNow} title={movie.title} year={movie.year} fanart={movie.fanart} phone />
    <ActionButtons listTarget={ratingTarget} checkin={{ type: 'movie', id: movie.id }} favorites favoriteTarget={{ ...ratingTarget, title: movie.title, year: movie.year, fanart: movie.fanart }} historyTarget={{ ...ratingTarget, runtime: movie.facts.runtime }} />
  {/snippet}

  <!-- Keyed on the item: moving to another movie or show keeps this page, so the lazy sections start over. -->
  {#key media.slug}
    <NewCommentForm item={{ type: 'movie', id: movie.id, title: movie.fullTitle }} />
    <LazySection id="activity" load={() => lazy().activity(media)}>
      {#snippet children(tabs)}<ActivityTabs {tabs} />{/snippet}
    </LazySection>
  {/key}
  <ActorsStrip groups={[{ id: 'cast', label: 'Cast', cast: movie.cast }]} creditsHref="{movie.href}/credits" />
  {#key media.slug}
    <LazySection id="comments" load={() => lazy().comments(media)}>
      {#snippet children(tabs)}
        <CommentsPreview
          {tabs}
          item={{ type: 'movie', id: movie.id, title: movie.fullTitle }}
          viewer={data.user ? { slug: data.user.slug } : null}
          count={movie.commentCount}
          href={movie.href}
          dateOptions={data.datePreferences}
        />
      {/snippet}
    </LazySection>
  {/key}
  {#key media.slug}
    <LazySection id="lists" load={() => lazy().lists(media)}>
      {#snippet children(tabs)}<ListsPreview {tabs} count={movie.listCount} href={movie.href} />{/snippet}
    </LazySection>
  {/key}
</SummaryFrame>

{#key media.slug}
  <RelatedItems title={movie.title} load={() => lazy().related(media)} datePreferences={data.datePreferences} />
{/key}
