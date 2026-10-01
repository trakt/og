<!--
  `/discover`: the Frame sidebar with a nav to the page's sections, then
  the sections themselves. The nav links scroll to their section (smoothly, unless reduced motion is on) and a
  scrollspy marks the one in view. Trends is the two "Top... Last Week" sliders side by side, then come Featured
  Lists, the Summer TV Shows showcase and Recent Comments. Each section is a `<section>` with its `discoverSections`
  id. Recent Comments loads in the browser, so the page doesn't wait on it or fail with it.
-->
<script lang="ts">
import Frame from '$lib/components/frame/Frame.svelte';
import FrameNav from '$lib/components/frame/FrameNav.svelte';
import { scrollSpy } from '$lib/components/frame/scrollSpy';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { loadDiscover } from './loadDiscover.ts';
import { discoverSections } from './discoverSections.ts';
import FeaturedLists from './FeaturedLists.svelte';
import RecentComments from './RecentComments.svelte';
import SummerShows from './SummerShows.svelte';
import TopSlider from './TopSlider.svelte';

type Props = {
  data: Awaited<ReturnType<typeof loadDiscover>> & {
    user: HeaderUser | null;
    datePreferences: DatePreferences;
  };
};

const { data }: Props = $props();

let active = $state<string>();
const links = $derived(
  discoverSections.map(({ id, label, hideOnPhone }) => ({
    label,
    href: `#${id}`,
    current: id === active ? ('location' as const) : undefined,
    hideOnPhone,
  })),
);
const spy = scrollSpy(discoverSections.map(({ id }) => id), (id) => (active = id));
</script>

<svelte:head>
  <title>Discover new TV shows & movies - Trakt</title>
  <meta
    name="description"
    content="Check out the top TV shows & movies from last week. Explore featured lists. Check out the new Midseason 2022 TV shows. Read recent reviews & shouts."
  />
</svelte:head>

<Frame title="Discover" collapsible={data.user?.isVip ?? false} sidenavHidden={data.sidenavHidden}>
  {#snippet subtitle()}
    Find new TV shows and movies based on trends and curated content from the Trakt community.
  {/snippet}

  {#snippet sidebar()}
    <FrameNav heading="Trakt" {links} />
  {/snippet}

  <div class="discover" {@attach spy}>
    <section id="trends" class="trends" aria-label="Trends">
      <TopSlider
        title="Top TV Shows Last Week"
        seeMoreHref="/shows/watched"
        slides={data.topShows}
        datePreferences={data.datePreferences}
      />
      <TopSlider
        title="Top Movies Last Week"
        seeMoreHref="/movies/watched"
        slides={data.topMovies}
        datePreferences={data.datePreferences}
      />
    </section>
    <FeaturedLists />
    <SummerShows slides={data.summerShows} datePreferences={data.datePreferences} />
    <RecentComments viewer={data.user ? { slug: data.user.slug } : null} dateOptions={data.datePreferences} />
  </div>
</Frame>

<style>
/* The nav's links land each section right under the fixed header. */
.discover > :global(section[id]) {
  scroll-margin-block-start: var(--header-height);
}

@media (prefers-reduced-motion: no-preference) {
  :global(html:has(.discover)) {
    scroll-behavior: smooth;
  }
}

/* OG's `.popular-items-outer-wrapper.split`: 50/50 on desktops, stacked below 992px. */
.trends {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background-color: var(--color-slider-bg);

  @media (min-width: 992px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-height: 800px) {
    --fanart-slider-height: var(--slider-height-trends);
  }
}
</style>
