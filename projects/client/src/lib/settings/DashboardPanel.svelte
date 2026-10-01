<script lang="ts">
import { resolve } from '$app/paths';
import type { DashboardPrefs } from '$lib/dashboard/dashboardPrefs';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsCheck from '$lib/components/settings/SettingsCheck.svelte';
import SettingsSubheading from '$lib/components/settings/SettingsSubheading.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import type { PanelSettings } from '$lib/settings/PanelSettings';
import { settingOptions } from '$lib/settings/settingOptions';
let { panels = $bindable(), prefs = $bindable(), vip, grandfathered }: {
  panels: PanelSettings;
  prefs: DashboardPrefs;
  vip: boolean;
  grandfathered: boolean;
} = $props();
const sections = [
  ['hide_on_deck', 'Hide Up Next', false],
  ['hide_upcoming', 'Hide Upcoming Schedule', true],
  ['hide_list', 'Hide Watchlist', true],
  ['hide_stats', 'Hide Stats', true],
  ['hide_recently_watched', 'Hide Recently Watched', false],
  ['hide_network', 'Hide Social Feed', true],
  ['hide_recommendations', 'Hide Recommendations', true],
] as const;
</script>

<SettingsPanel id="dashboard" title="Dashboard" instructions>
  {#snippet extra()}<SettingsPanelLink href={resolve('/dashboard')} text="View Dashboard" />{/snippet}
  <SettingsSubheading>Up Next</SettingsSubheading>
  <SettingsSelect id="on-deck-sort" label="Sorting" bind:value={panels.progress.on_deck.sort} bind:how={panels.progress.on_deck.sort_how} options={settingOptions.progress} />
  <SettingsSelect id="on-deck-poster" label="Poster" bind:value={prefs.on_deck_poster} options={settingOptions.posters} />
  <SettingsSelect id="on-deck-bars" label="Progress Bars" bind:value={panels.progress.on_deck.simple_progress} options={settingOptions.bars} />
  <SettingsSelect id="on-deck-refresh" label="Auto Refresh" bind:value={panels.progress.on_deck.refresh} options={settingOptions.refresh}>
    {#snippet help()}Choose what happens after you <b>watch</b> the next episode.{/snippet}
  </SettingsSelect>
  <SettingsCheck id="on-deck-favorites" label="Only Favorites" bind:checked={panels.progress.on_deck.only_favorites} disabled={!vip} vip>
    {#snippet help()}Only display episodes streaming on your favorite services.{/snippet}
  </SettingsCheck>
  <SettingsSubheading middle>Upcoming Schedule</SettingsSubheading>
  <SettingsSelect id="upcoming-filter" label="Filter" bind:value={prefs.upcoming_filter} options={[
    [prefs.upcoming_filter === 'shows-movies' ? 'shows-movies' : 'shows', 'All my TV shows'], ['premieres', 'My premieres'], ['new-shows', 'My new shows'], ['finales', 'My finales'],
  ]}>
    {#snippet help()}Movies on your watchlist are always included.{/snippet}
  </SettingsSelect>
  <SettingsSelect id="upcoming-start" label="Start Day" bind:value={prefs.upcoming_start_day} options={settingOptions.days} />
  <SettingsSelect id="upcoming-poster" label="Poster" bind:value={prefs.upcoming_poster} options={settingOptions.posters} />
  <SettingsSubheading middle>Recommendations</SettingsSubheading>
  <SettingsCheck id="ignore-collected" label="Ignore Library" bind:checked={panels.recommendations.ignore_collected}>
    {#snippet help()}TV shows and movies you've already added to your library will be hidden.{/snippet}
  </SettingsCheck>
  <SettingsCheck id="ignore-watchlisted" label="Ignore Watchlisted" bind:checked={panels.recommendations.ignore_watchlisted}>
    {#snippet help()}TV shows and movies you've already watchlisted will be hidden.{/snippet}
  </SettingsCheck>
  <SettingsSubheading middle>Sections {#if !grandfathered}<VipLabel badge={{ kind: 'vip', tag: null, years: null }} small />{/if}</SettingsSubheading>
  {#each sections as [key, label, gated] (key)}
    <SettingsCheck id={key} {label} bind:checked={prefs[key]} disabled={gated && !grandfathered} />
  {/each}
</SettingsPanel>
