<!-- The show summary (`/shows/:id`): the media frame filled with one show, its recent episodes and its seasons. -->
<script lang="ts">
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import { overlay } from '$lib/overlay/overlay';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import NewCommentForm from '$lib/components/comments/NewCommentForm.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import ActivityTabs from '$lib/components/summary/ActivityTabs.svelte';
import ActorsStrip from '$lib/components/summary/ActorsStrip.svelte';
import CommentsPreview from '$lib/components/summary/CommentsPreview.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import LazySection from '$lib/components/summary/LazySection.svelte';
import ListsPreview from '$lib/components/summary/ListsPreview.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import RelatedItems from '$lib/components/summary/RelatedItems.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import SummaryTitle from '$lib/components/summary/SummaryTitle.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { browserSectionsClient } from '$lib/summary/browserSectionsClient';
import { countLabel } from '$lib/utils/countLabel';
import type { loadShow } from './loadShow.ts';
import RecentEpisodes from './RecentEpisodes.svelte';
import SeasonsGrid from './SeasonsGrid.svelte';
import ShowDetails from './ShowDetails.svelte';

type Props = {
  data: Awaited<ReturnType<typeof loadShow>> & { user: HeaderUser | null; datePreferences: DatePreferences };
};

const { data }: Props = $props();
const show = $derived(data.show);
const ratingTarget = $derived({ type: 'show' as const, id: show.id, title: show.fullTitle });
const allEpisodes = $derived(`${show.href}/seasons/all`);
const media = $derived({
  type: 'show' as const,
  id: show.id,
  slug: show.slug,
  title: show.title,
  airedEpisodes: show.airedEpisodes,
});
const lazy = () => browserSectionsClient(data.user !== null);

const sections = $derived([
  { label: 'Overview', href: '#overview' },
  { label: 'Activity', href: '#activity' },
  { label: 'Recent Episodes', href: '#recent-episodes' },
  ...(show.cast.length > 0 || show.guestStars.length > 0
    ? [{ label: 'Actors', href: '#actors', more: { href: `${show.href}/credits`, text: 'All cast & crew' } }]
    : []),
  ...(show.seasonCount > 0
    ? [{
      label: countLabel(show.seasonCount, 'Season'),
      href: '#seasons',
      more: { href: allEpisodes, text: 'All episodes' },
    }]
    : []),
  {
    label: countLabel(show.commentCount, 'Comment'),
    href: '#comments',
    more: { href: `${show.href}/comments`, text: 'All comments' },
  },
  {
    label: countLabel(show.listCount, 'List'),
    href: '#lists',
    more: { href: `${show.href}/lists`, text: 'All lists' },
  },
]);
</script>

<svelte:head>
  <title>{show.fullTitle} - Trakt</title>
  {#if show.overview}<meta name="description" content={show.overview} />{/if}
</svelte:head>

<!-- Hrefs are built from API slugs, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<FanartHeader image={show.fanart} dropped={overlay.state('show', show.id).dropped}>
  <SummaryTitle title={show.title} year={show.year} certification={show.certification} />
  {#snippet stats()}
    <RatingsStrip rating={show.rating} rateLabel="show" {ratingTarget} external={show.external} counts={show.counts} />
  {/snippet}
</FanartHeader>

<SummaryFrame label={show.title}>
  {#snippet tools()}
    <MediaTools target={{ type: 'show', id: show.id, title: show.title, href: show.href, tmdb: show.links.find((link) => link.label === 'TMDB')?.href }} updatedAt={show.updatedAt} />
  {/snippet}

  {#snippet sidebar()}
    <SummaryPoster {ratingTarget} image={show.poster} alt={show.fullTitle} />
    <WatchNow button={data.watchNow} title={show.title} year={show.year} fanart={show.fanart} />
    <SectionNav {sections} label="{show.title} sections" />
    <ExternalLinks links={show.links} />
  {/snippet}

  {#snippet details()}
    <ShowDetails {show} privateNotes={data.privateNotes} />
  {/snippet}

  {#snippet actions()}
    <WatchNow button={data.watchNow} title={show.title} year={show.year} fanart={show.fanart} phone />
    <ActionButtons listTarget={ratingTarget} favorites favoriteTarget={{ ...ratingTarget, title: show.title, year: show.year, fanart: show.fanart }} historyTarget={{ ...ratingTarget, airedEpisodes: show.airedEpisodes, runtime: show.runtime, episodeIds: show.episodeIds }} />
  {/snippet}

  <!-- Keyed on the item: moving to another movie or show keeps this page, so the lazy sections start over. -->
  {#key media.slug}
    <NewCommentForm item={{ type: 'show', id: show.id, title: show.title, airedEpisodes: show.airedEpisodes }} />
    <LazySection id="activity" load={() => lazy().activity(media)}>
      {#snippet children(tabs)}<ActivityTabs {tabs} />{/snippet}
    </LazySection>
  {/key}
  <RecentEpisodes
    upNext={show.recent.upNext}
    next={show.recent.next}
    aired={show.recent.aired}
    allHref={allEpisodes}
    datePreferences={data.datePreferences}
  />
  <ActorsStrip
    groups={[
      { id: 'series-regulars', label: 'Series Regulars', cast: show.cast },
      { id: 'guest-stars', label: 'Guest Stars', cast: show.guestStars },
    ]}
    creditsHref="{show.href}/credits"
  />
  <SeasonsGrid showId={show.id} seasons={show.seasons} signedIn={data.signedIn} initialFilters={data.filters} datePreferences={data.datePreferences} />
  {#key media.slug}
    <LazySection id="comments" load={() => lazy().comments(media)}>
      {#snippet children(tabs)}
        <CommentsPreview
          {tabs}
          item={{ type: 'show', id: show.id, title: show.title, airedEpisodes: show.airedEpisodes }}
          viewer={data.user ? { slug: data.user.slug } : null}
          count={show.commentCount}
          href={show.href}
          dateOptions={data.datePreferences}
        />
      {/snippet}
    </LazySection>
  {/key}
  {#key media.slug}
    <LazySection id="lists" load={() => lazy().lists(media)}>
      {#snippet children(tabs)}<ListsPreview {tabs} count={show.listCount} href={show.href} />{/snippet}
    </LazySection>
  {/key}
</SummaryFrame>

{#key media.slug}
  <RelatedItems title={show.title} load={() => lazy().related(media)} datePreferences={data.datePreferences} />
{/key}
