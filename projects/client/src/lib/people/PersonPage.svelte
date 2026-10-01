<!-- The person summary (`/people/:id`): the media frame with a bio, then the credits grid by department. -->
<script lang="ts">
import { afterNavigate, replaceState } from '$app/navigation';
import { page } from '$app/state';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import FadeHideItems from '$lib/components/filters/FadeHideItems.svelte';
import { fadeHideOptions } from '$lib/components/filters/fadeHide';
import FilterMenu from '$lib/components/filters/FilterMenu.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import AdditionalStat from '$lib/components/summary/AdditionalStat.svelte';
import AdditionalStats from '$lib/components/summary/AdditionalStats.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import MediaTools from '$lib/components/summary/MediaTools.svelte';
import NameList from '$lib/components/summary/NameList.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import PrivateNotes from '$lib/components/summary/PrivateNotes.svelte';
import RatingsStrip from '$lib/components/summary/RatingsStrip.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import SummaryTitle from '$lib/components/summary/SummaryTitle.svelte';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { countLabel } from '$lib/utils/countLabel';
import { formatDate } from '$lib/utils/formatDate';
import { creditHideOptions } from './creditHideOptions.ts';
import { matchesCreditFilter } from './matchesCreditFilter.ts';
import { creditSorts } from './creditSorts.ts';
import type { CreditsQuery } from './CreditsQuery.ts';
import type { loadPerson } from './loadPerson.ts';
import type { PersonCredit } from './PersonCredit.ts';
import { toCreditsSearch } from './toCreditsSearch.ts';
import { visibleCredits } from './visibleCredits.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadPerson>> & { datePreferences: DatePreferences; user: HeaderUser | null };
};

const { data }: Props = $props();
const person = $derived(data.person);
const facts = $derived(person.facts);

// Birthdays are calendar days, so they format in UTC or they'd slip a day west of Greenwich.
const day = (date: string) => formatDate(date, { ...data.datePreferences, format: 'LL', timeZone: 'UTC' });

// The loader parsed the URL once; after that the controls own the view and write it back to the URL.
// svelte-ignore state_referenced_locally
let query = $state<CreditsQuery>({ ...data.query });
// svelte-ignore state_referenced_locally
let tab = $state(person.defaultDepartment);

const tabs = $derived(
  person.departments.map((department) => {
    const credits = visibleCredits(department.credits, query).filter((credit) =>
      !query.hide.some((option) =>
        matchesCreditFilter({ option, credit, state: data.user ? overlay.state(credit.type, credit.id) : {} })
      )
    );

    return { id: department.id, label: department.label, count: credits.length.toLocaleString('en-US'), credits };
  }),
);
const sortName = $derived(creditSorts.find(({ id }) => id === query.sort)?.label);
const textLinks = $derived(person.links.filter(({ icon }) => !icon));
const filtered = $derived(
  !query.movies || !query.shows || query.terms !== '' || query.fade.length > 0 || query.hide.length > 0,
);
const progress = $derived.by(() => {
  const credits = tabs.find(({ id }) => id === tab)?.credits ?? [];
  const fills = credits.map((credit) =>
    quickIconFill({ state: overlay.state(credit.type, credit.id), airedEpisodes: credit.airedEpisodes })
  );
  return {
    watched: fills.filter((fill) => fill.watched === 1).length,
    collected: fills.filter((fill) => fill.collected === 1).length,
    visible: credits.length,
    total: person.departments.find(({ id }) => id === tab)?.credits.length ?? 0,
  };
});

// URL canonicalization runs after the router starts, including when a shared link uses a different param order.
let ready = $state(false);
afterNavigate(() => (ready = true));
$effect(() => {
  if (!ready) return;
  const search = toCreditsSearch(query);
  if (search === page.url.search) return;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- the same page, with only its query changed
  replaceState(`${page.url.pathname}${search}${page.url.hash}`, page.state);
});

// OG's under-title: year, then the status of an unreleased movie or a show's episode count, in italics.
function yearLine(credit: PersonCredit) {
  const episodes = credit.episodeCount > 0 && !data.hideEpisodeCounts
    ? countLabel(credit.episodeCount, 'episode')
    : undefined;
  const parts = [
    credit.year ? String(credit.year) : undefined,
    credit.status ? { em: credit.status } : undefined,
    episodes ? { em: episodes } : undefined,
  ].filter((part) => part !== undefined);
  if (parts.length === 0) return ' ';
  return parts.flatMap((part, i) => (i === 0 ? [part] : [' — ', part]));
}
</script>

<svelte:head>
  <title>{person.name} - Trakt</title>
  {#if person.biography}<meta name="description" content={person.biography} />{/if}
</svelte:head>

<!-- OG's person ratings bar only ever counted lists, and it collapsed with none (`.no-stats`). -->
{#snippet lists()}
  <RatingsStrip
  counts={[{ count: person.listCount, label: person.listCount === 1 ? 'list' : 'lists', href: `${person.href}/lists` }]}
/>
{/snippet}

<FanartHeader image={person.fanart?.image} caption={person.fanart} stats={person.listCount > 0 ? lists : undefined}>
  <SummaryTitle title={person.name} />
</FanartHeader>

<SummaryFrame label={person.name}>
  {#snippet tools()}
    <MediaTools target={{ type: 'person', id: person.id, title: person.name, href: person.href, tmdb: person.links.find((link) => link.label === 'TMDB')?.href }} updatedAt={person.updatedAt} datasource="TMDB" />
  {/snippet}

  {#snippet sidebar()}
    <SummaryPoster image={person.headshot} alt={person.name} />
    <SectionNav
      sections={[{ label: 'Biography', href: '#overview' }, { label: 'Credits', href: '#credits' }]}
      label="{person.name} sections"
    />
    <ExternalLinks links={person.links} />
  {/snippet}

  {#snippet details()}
    <AdditionalStats>
      {#if facts.age !== undefined}
        <AdditionalStat label="Age">{facts.age}</AdditionalStat>
      {/if}
      {#if facts.gender}
        <AdditionalStat label="Gender">{facts.gender}</AdditionalStat>
      {/if}
      {#if facts.birthday}
        <AdditionalStat label="Birthday">{day(facts.birthday)}</AdditionalStat>
      {/if}
      {#if facts.death}
        <AdditionalStat label="Died">{day(facts.death)}</AdditionalStat>
      {/if}
      {#if facts.birthplace}
        <AdditionalStat label="Birthplace">{facts.birthplace}</AdditionalStat>
      {/if}
      {#if facts.knownFor}
        <AdditionalStat label="Known For">{facts.knownFor}</AdditionalStat>
      {/if}
      {#if textLinks.length > 0}
        <AdditionalStat label="Links" phoneOnly>
          <NameList names={textLinks.map(({ label, href }) => ({ name: label.replace(' Site', ''), href }))} />
        </AdditionalStat>
      {/if}
    </AdditionalStats>
    <Overview overview={person.biography} />
    <PrivateNotes {...data.privateNotes} />
  {/snippet}

  {#snippet actions()}
    <ActionButtons progress={data.user ? progress : undefined} history={false} library={false} comment={false} listLabel="Add to list" listTarget={{ type: 'person', id: person.id, title: person.name }} />
  {/snippet}

  <section class="credits" id="credits" aria-labelledby="credits-heading">
    <div class="heading">
      <h2 id="credits-heading"><strong>Credits</strong></h2>
      <div class="controls">
        <Dropdown>
          {#snippet trigger()}{sortName}{/snippet}
          <ul>
            {#each creditSorts as sort (sort.id)}
              <li>
                <button type="button" aria-current={sort.id === query.sort}
                  onclick={() => (query = { ...query, sort: sort.id })}>{sort.label}</button>
              </li>
            {/each}
          </ul>
        </Dropdown>
        <SortDirection bind:flipped={query.reversed} />
        <TermsFilter bind:terms={query.terms} vip={data.user?.isVip ?? false} />
        <FilterMenu active={filtered} count={query.fade.length + query.hide.length + Number(!query.movies) + Number(!query.shows)}>
          <FadeHideItems value={query} fadeOptions={data.user ? fadeHideOptions : []} hideOptions={data.user ? creditHideOptions : creditHideOptions.filter(({ id }) => ['released', 'unreleased', 'noreleasedate', 'self'].includes(id))}
            onchange={(next) => (query = { ...query, fade: next.fade.filter((id): id is (typeof fadeHideOptions)[number]['id'] => fadeHideOptions.some((option) => option.id === id)), hide: next.hide })}
            onreset={() => (query = { ...query, terms: '', movies: true, shows: true })} />
          <hr />
          <ul>
            <li class="header" role="presentation">Types</li>
            <li><button type="button" aria-pressed={query.movies} onclick={() => (query = { ...query, movies: !query.movies })}>
                Movies
              </button></li>
            <li><button type="button" aria-pressed={query.shows} onclick={() => (query = { ...query, shows: !query.shows })}>
                Shows
              </button></li>
          </ul>
        </FilterMenu>
      </div>
    </div>

    {#if tabs.length > 0}
      <PillTabs {tabs} label="Credits" bind:selected={tab}>
        {#snippet panel(id)}
          {@const credits = tabs.find((department) => department.id === id)?.credits ?? []}
          <PosterGrid columns={5}>
            {#each credits as credit (`${credit.type}-${credit.id}`)}
              {@const state = overlay.state(credit.type, credit.id)}
              <PosterCard
                faded={!!data.user && query.fade.some((option) => matchesCreditFilter({ option, credit, state }))}
                href={credit.href}
                title={credit.title}
                fullTitle={credit.year ? `${credit.title} (${credit.year})` : credit.title}
                image={credit.image}
                subtitles={[yearLine(credit), credit.characters || ' ']}
                userRating={state.rating}
                dropped={state.dropped}
                icons={{
                  fill: quickIconFill({
                    state,
                    airedEpisodes: credit.airedEpisodes,
                    runtime: credit.runtime,
                    datePreferences: data.datePreferences,
                  }),
                  ratingTarget: { type: credit.type, id: credit.id, title: credit.title },
                  watchTarget: { type: credit.type, id: credit.id, title: credit.title, airedEpisodes: credit.airedEpisodes, runtime: credit.runtime },
                  rating: credit.rating,
                  // ponytail: OG showed watch now only with sources in the viewer's country. Until #60 brings
                  // sources, anything not out yet is taken to have none, like the chart pages.
                  watchNow: credit.released ? 'play' : undefined,
                }}
              />
            {/each}
          </PosterGrid>
        {/snippet}
      </PillTabs>
    {/if}
  </section>
</SummaryFrame>

<style>
.credits {
  margin-block-start: var(--gutter);
}

/* OG's h2 with the sort wrapper floated right, 7px above the heading's baseline. */
.heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  & h2 {
    margin: 0;
  }
}

.controls {
  display: flex;
  align-items: center;
  margin-block-start: -7px;
}
</style>
