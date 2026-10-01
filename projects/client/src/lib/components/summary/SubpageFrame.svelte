<!--
  The frame every item subpage shares: the
  slim fanart header with its label line, the title linking back and the previous and next arrows to the sibling's
  same subpage, then the summary sidebar (the poster linking back, Watch Now, optional section anchors, external links)
  beside `children` across the whole content column, with an optional `subnav` bar above it. Feed it
  `loadSubpageMedia`, or `loadPersonSubpage` for a person.
    <SubpageFrame {...data} label="Cast & Crew for..." icon={friends} sections={[...]}>...</SubpageFrame>
-->
<script lang="ts">
import { page } from '$app/state';
import { overlay } from '$lib/overlay/overlay';
import { mediaSpoilers } from '$lib/settings/mediaSpoilers';
import EpisodeTypeBadge from '$lib/components/media/EpisodeTypeBadge.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import type { WatchNowButton } from '$lib/components/watchnow/watchNow';
import type { SubpageFrameMedia } from '$lib/subpage/SubpageFrameMedia';
import type { ComponentProps, Snippet } from 'svelte';
import ExternalLinks from './ExternalLinks.svelte';
import ItemNav from './ItemNav.svelte';
import SectionNav from './SectionNav.svelte';
import SubpageTitle from './SubpageTitle.svelte';
import SummaryFrame from './SummaryFrame.svelte';
import SummaryPoster from './SummaryPoster.svelte';

interface Props {
  media: SubpageFrameMedia;
  watchNow: WatchNowButton | null;
  /** The line above the title: "Cast & Crew for...". */
  label: string;
  icon?: string;
  sections?: ComponentProps<typeof SectionNav>['sections'];
  previous?: ComponentProps<typeof ItemNav>['previous'];
  next?: ComponentProps<typeof ItemNav>['next'];
  /** OG's `.subnav-wrapper` under the header (the comments' type and sort dropdowns). */
  subnav?: Snippet;
  /** The full ratings strip on stats subpages. */
  stats?: Snippet;
  /** Seasons and episodes use the shorter ratings strip and corresponding poster overlap. */
  compactStats?: boolean;
  episodeBadge?: ComponentProps<typeof EpisodeTypeBadge>;
  children: Snippet;
}

const {
  media,
  watchNow,
  label,
  icon,
  sections = [],
  previous,
  next,
  subnav,
  stats,
  compactStats = false,
  episodeBadge,
  children,
}: Props = $props();
const hideScreenshot = $derived(
  media.spoilerTarget && page.data.user
    ? mediaSpoilers({
      type: media.spoilerTarget.type,
      spoilers: page.data.settings?.browsing?.spoilers,
      watched: overlay.state(media.spoilerTarget.type, media.spoilerTarget.id, media.spoilerTarget.season).watched,
    }).screenshot
    : false,
);
</script>

<!-- The item links are the canonical API slugs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<FanartHeader image={hideScreenshot ? media.spoilerFanart : media.fanart} slim {stats}
  statsHeight={compactStats ? 'var(--media-stats-compact-strip-height)' : undefined}>
  <SubpageTitle target={media.spoilerTarget} {label} {icon} parents={media.parents} title={media.title} year={media.year} href={media.href} />
  {#snippet edges()}
    <ItemNav {previous} {next} up={media.parents.at(-1)?.href} />
  {/snippet}
</FanartHeader>

<SummaryFrame label={media.title} fullWidth {subnav}
  posterOverlap={compactStats ? 'var(--media-stats-compact-poster-overlap)' : undefined}>
  {#snippet sidebar()}
    <a href={media.href}>
      <SummaryPoster image={media.poster} alt={media.item.title} ratingTarget={media.ratingTarget} {episodeBadge} />
    </a>
    {#if watchNow && media.watchNow}
      <WatchNow button={watchNow} title={media.watchNow.title} year={media.watchNow.year} fanart={media.fanart} />
    {/if}
    {#if sections.length > 0}
      <SectionNav {sections} label="{media.title} sections" />
    {/if}
    <ExternalLinks links={media.links} />
  {/snippet}

  {#snippet details()}
    {@render children()}
  {/snippet}
</SummaryFrame>
