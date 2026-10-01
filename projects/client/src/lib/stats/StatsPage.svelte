<script lang="ts">
import RatingDistribution from '$lib/components/summary/RatingDistribution.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import SubpageFrame from '$lib/components/summary/SubpageFrame.svelte';
import chart from '$lib/icons/solid/chart-column.svg?raw';
import type { loadStats } from './loadStats.ts';

const { data }: { data: Awaited<ReturnType<typeof loadStats>> } = $props();
const title = $derived(`Stats for ${data.media.item.title}`);
</script>

<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content={title} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={title} />
  {#if data.media.poster}<meta property="og:image" content={data.media.poster} />{/if}
</svelte:head>

<SubpageFrame media={{ ...data.media, ratingTarget: data.stats.strip.ratingTarget }} watchNow={data.watchNow}
  episodeBadge={data.media.episodeType && !data.settings?.browsing?.hide_episode_type_tags ? { label: data.media.episodeType.text, kind: data.media.episodeType.kind } : undefined}
  compactStats={data.media.item.type === 'season' || data.media.item.type === 'episode'}
  label="Stats for..." icon={chart}
  sections={[{ label: 'Trakt Ratings', href: '#trakt-ratings' }]}>
  {#snippet stats()}<RatingsStrip {...data.stats.strip} />{/snippet}
  <RatingDistribution {...data.stats} />
</SubpageFrame>
