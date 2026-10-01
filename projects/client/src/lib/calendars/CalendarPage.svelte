<!--
  Account-configured calendar: the Frame sidebar with the count, the My
  nav (signed in) and the All nav, then a date separator and a row of fanart cards per day, and the week paging under
  the last day. `/calendars/[calendar]/[[start]]` and `/calendars/my/[calendar]/[[start]]` render it.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import AdvancedFiltersPanel from '$lib/components/filters/AdvancedFiltersPanel.svelte';
import AdvancedFiltersToggle from '$lib/components/filters/AdvancedFiltersToggle.svelte';
import AppliedFilters from '$lib/components/filters/AppliedFilters.svelte';
import FiltersUpsell from '$lib/components/filters/FiltersUpsell.svelte';
import { type AdvancedFilters, advancedFiltersSearch } from '$lib/components/filters/advancedFilters';
import { filterTags } from '$lib/components/filters/filterTags';
import { watchNowTiles } from '$lib/components/filters/watchNowFilter';
import { page } from '$app/state';
import CalendarDayHeader from '$lib/components/calendar/CalendarDayHeader.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import TextMediaCard from '$lib/components/media/TextMediaCard.svelte';
import type { ComponentProps } from 'svelte';
import type QuickIcons from '$lib/components/media/QuickIcons.svelte';
import type { CalendarCard } from '$lib/calendars/toCalendarCard';
import NoData from '$lib/components/empty/NoData.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import Frame from '$lib/components/frame/Frame.svelte';
import FrameNav from '$lib/components/frame/FrameNav.svelte';
import FeedPopover from '$lib/components/feeds/FeedPopover.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import PageNav from '$lib/components/pagination/PageNav.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import calendarClock from '$lib/icons/thin/calendar-clock.svg?raw';
import { formatDate } from '$lib/utils/formatDate';
import type { loadCalendar } from '$lib/calendars/loadCalendar';
import { MY_CALENDARS } from '$lib/calendars/myCalendars';
import { PUBLIC_CALENDARS } from '$lib/calendars/publicCalendars';
import { calendarFilterState } from '$lib/calendars/calendarFilterState';
import { visibleCalendarDays } from '$lib/calendars/visibleCalendarDays';
import { toCalendarCard } from '$lib/calendars/toCalendarCard';
import { underTitle } from '$lib/calendars/underTitle';

type Props = {
  data: Awaited<ReturnType<typeof loadCalendar>> & { user: HeaderUser | null; datePreferences: DatePreferences };
};

const { data }: Props = $props();

const vip = $derived(data.user?.isVip ?? false);
const tags = $derived(filterTags(data.filters));
const tiles = $derived(watchNowTiles({
  watchnow: data.filters.watchnow,
  sources: data.filterSources ?? new Map(),
  country: data.watchNowCountry,
  favorites: data.watchNowFavorites,
}));
const filterCount = $derived(tags.length + tiles.length);
let panelOpen = $state(false);
let funnel = $state<HTMLButtonElement>();
const panelId = $props.id();
function closePanel() {
  panelOpen = false;
  funnel?.focus();
}
function applyFilters(filters: AdvancedFilters) {
  panelOpen = false;
  funnel?.focus();
  const search = advancedFiltersSearch(filters);
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- retain this calendar's current date path
  goto(`${page.url.pathname}${search ? `?${search}` : ''}`);
}

// OG's calendars leave out the partial options.
const options = fadeHideOptions.filter((option) => !('showsOnly' in option));
let fadeHide = $derived<FadeHide>(data.fadeHide);

// Hiding drops a card and so the count ; fading only dims it.
const days = $derived(
  visibleCalendarDays({
    days: data.days,
    isHidden: (type, id) => overlay.isHidden('calendar', type, id),
  }).map((day) => ({
    ...day,
    cards: day.items.flatMap((item) => {
      const card = toCalendarCard(item, { ...data.datePreferences, imageType: data.preferences.imageType });
      const state = overlay.state(card.overlay.type, card.overlay.id, card.collectionContext);
      const fill = quickIconFill({ state, datePreferences: data.datePreferences });
      const filterState = calendarFilterState(state, card.show ? overlay.state('show', card.show) : undefined);
      const matches = (id: (typeof options)[number]['id']) => matchesFadeHide(id, filterState, fill);
      return fadeHide.hide.some(matches) ? [] : [{ ...card, state, fill, faded: fadeHide.fade.some(matches) }];
    }),
  })),
);
const title = $derived(
  underTitle({
    calendar: data.calendar,
    count: days.reduce((sum, day) => sum + day.cards.length, 0),
    window: data.window,
    today: data.today,
    datePreferences: data.datePreferences,
  }),
);

// OG's links keep the query string and swap the start date.
const base = { all: '/calendars', my: '/calendars/my' } as const;
const href = (target: 'all' | 'my', slug: string, start: string) =>
  `${base[target]}/${slug}/${start}${page.url.search}`;
const prevHref = $derived(href(data.target, data.calendar.slug, data.window.previous));
const nextHref = $derived(href(data.target, data.calendar.slug, data.window.next));
const navLinks = (target: 'all' | 'my', calendars: readonly { slug: string; label: string }[]) =>
  calendars.map(({ slug, label }) => ({
    label,
    href: href(target, slug, data.window.start),
    current: target === data.target && slug === data.calendar.slug,
  }));
const myLinks = $derived(navLinks('my', MY_CALENDARS));
const allLinks = $derived(navLinks('all', PUBLIC_CALENDARS));

const unit = $derived(data.preferences.period);
const heading = $derived(
  unit === 'month'
    ? formatDate(`${data.window.start}T00:00:00Z`, { ...data.datePreferences, format: 'my', timeZone: 'UTC' })
    : 'Calendar',
);
function cardIcons(
  card: CalendarCard & { fill: ComponentProps<typeof QuickIcons>['fill'] },
): Omit<ComponentProps<typeof QuickIcons>, 'small'> {
  return {
    collectionTarget: { ...card.overlay, title: card.title, season: card.collectionContext },
    listTarget: { ...card.overlay, title: card.title },
    fill: card.fill,
    rating: card.rating,
    ratingTarget: { ...card.overlay, title: card.title },
    listLabel: card.episode ? 'Add to list' : undefined,
    watchNow: card.episode || data.preferences.imageType === 'none' ? 'play' : undefined,
    hide: card.episode ? 'show' : undefined,
    hideTarget: card.hideTarget,
    hideSection: 'calendar',
  };
}
</script>

<svelte:head>
  <title>{title.sentence.slice(0, -1)} - Trakt</title>
  <meta name="description" content={title.sentence} />
</svelte:head>

<Frame
  title={heading}
  {prevHref}
  {nextHref}
  {unit}
  collapsible={data.user?.isVip ?? false}
  sidenavHidden={data.sidenavHidden}
  {panelOpen}
>
  {#snippet panel()}
    <AdvancedFiltersPanel id="{panelId}-filters" open={panelOpen} config={data.filterConfig} filters={data.filters}
      {vip} country={data.watchNowCountry} favorites={data.watchNowFavorites} sources={data.filterSources}
      clearHref={page.url.pathname} onapply={applyFilters} onclose={closePanel} />
  {/snippet}
  {#snippet subtitle()}
    <strong>{title.count}</strong> {title.rest}
  {/snippet}

  {#snippet icons()}
    <FadeHideMenu value={fadeHide} {options} cookie="calendars" onchange={(next) => (fadeHide = next)} />
    <AdvancedFiltersToggle bind:open={panelOpen} bind:button={funnel} controls="{panelId}-filters"
      active={filterCount > 0} count={vip ? filterCount : 0} />
  {/snippet}

  {#snippet sidebar()}
    {#if filterCount > 0}
      <AppliedFilters {tags} {tiles} {vip} clearHref={page.url.pathname} onedit={() => (panelOpen = true)} />
    {/if}
    {#if data.user}
      <FrameNav
        heading="My"
        links={myLinks}
        action={{ href: '/settings/notifications', label: 'Notifications', svg: calendarClock }}
      >
        {#snippet accessory(index)}
          <FeedPopover
            isVip={data.user?.isVip ?? false}
            url={data.feedUrls[MY_CALENDARS.at(index)?.slug ?? ''] ?? null}
            label="iCal Feed for {MY_CALENDARS.at(index)?.label}"
          />
        {/snippet}
      </FrameNav>
    {/if}
    <FrameNav heading="All" links={allLinks} />
  {/snippet}

  {#if days.some((day) => day.cards.length > 0) && !data.upsellHidden}
    <FiltersUpsell {vip} signedIn={data.user !== null} />
  {/if}
  <div class={['calendar-days', data.preferences.layout, data.preferences.imageType]}>
  {#each days as day (day.date)}
    <section class="day">
      <CalendarDayHeader date={day.date} today={day.date === data.today} filler={day.filler}
        compact={data.preferences.layout === 'grid'} autoscroll={data.preferences.autoscroll} />
      {#if !day.filler}
      {#if day.cards.length === 0}
        {#if data.preferences.layout === 'grid'}<div class="empty-day" role="img" aria-label="Nothing on this day."></div>
        {:else}<NoData inFrame>Nothing on this day.</NoData>{/if}
      {:else}
        <div class="cards">
          {#each day.cards as card (card.key)}
            <div class="card">
              {#if data.preferences.imageType === 'none'}
                <TextMediaCard compact={data.preferences.layout === 'grid'} {...card} icons={cardIcons(card)} />
              {:else if data.preferences.layout === 'grid'}
                <PosterCard href={card.href} title={card.title} number={card.number} image={card.image} logo={card.logo} logoMode={card.logoMode}
                  variant={card.variant === 'poster' ? 'poster' : card.variant === 'banner' ? 'banner' : 'screenshot'}
                  calendar userRating={card.state.rating} faded={card.faded} icons={cardIcons(card)}
                  subtitles={card.episode ? [card.smallTitle ?? '', card.schedule ?? ''] : [' ', ' ']}
                  episodeBadge={card.episodeBadge} />
              {:else}
                <FanartCard {...card} episodeBadge={undefined} userRating={card.state.rating} icons={cardIcons(card)} />
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      {/if}
    </section>
  {/each}
  </div>
  <PageNav {prevHref} {nextHref} {unit} />
</Frame>

<style>
.calendar-days.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-block-end: 1px solid var(--color-frame-border);
  & .day {
    border-inline-start: 1px solid var(--color-frame-border);
  }
  & .cards {
    display: block;
  }
  & .card {
    border: 0;
  }
  &.none :global(.date-separator) {
    margin-block-end: var(--calendar-card-bottom);
  }
  & .day:is(:hover, :focus-within) :global(.date-separator) {
    background: var(--brand-primary);
    color: var(--color-frame-text);
  }
  @media (max-width: 767px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.day {
  container-type: inline-size;
  background: var(--color-frame);
  color: var(--color-frame-text);
}
.list .day > :global(*) {
  border-block-end: 1px solid var(--color-frame-border);
}
.cards {
  display: grid;
  grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
}
@container (width >= 468px) {
  .cards {
    --columns: 2;
  }
}
@container (width >= 692px) {
  .cards {
    --columns: 3;
  }
}
@container (width >= 1300px) {
  .cards {
    --columns: 4;
  }
}
.banner .cards {
  --columns: 1;
}
@container (width >= 692px) {
  .banner .cards {
    --columns: 2;
  }
}
@container (width >= 1300px) {
  .banner .cards {
    --columns: 3;
  }
}
.poster .cards {
  --columns: 2;
}
@container (width >= 468px) {
  .poster .cards {
    --columns: 3;
  }
}
@container (width >= 692px) {
  .poster .cards {
    --columns: 4;
  }
}
@container (width >= 892px) {
  .poster .cards {
    --columns: 6;
  }
}
.card {
  border-inline-end: 1px solid var(--color-frame-border);
  border-block-end: 1px solid var(--color-frame-border);
}
.empty-day {
  aspect-ratio: var(--ratio-fanart);
  background-image: var(--image-placeholder-clearart);
  background-size: contain;
  background-repeat: no-repeat;
  opacity: var(--calendar-empty-opacity);
}
</style>
