<!--
  The Global panel: what the watch and list buttons do, and the site-wide display toggles. Where each one
  takes effect is other pages' work.
-->
<script lang="ts">
import SettingsCheck from '$lib/components/settings/SettingsCheck.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import type { SettingsDraft } from './SettingsDraft';
import { settingOptions } from './settingOptions';

let { draft = $bindable() }: { draft: SettingsDraft } = $props();

const TOGGLES = [
  ['hideEpisodeTypeTags', 'Hide Premiere & Finale Tags', 'Hide additional premiere & finale tags in grid views.'],
  ['otherSiteRatings', 'Additional Site Ratings', 'IMDB, TMDB, Rotten Tomatoes, and Metacritic.'],
  [
    'displayEarlyRatings',
    'Display Early Ratings',
    'Display ratings for unreleased movies, shows, seasons, and episodes.',
  ],
  ['watchOnlyOnce', 'Disable Multiple Plays', 'Only allow 1 play per movie or episode. This affects web and apps.'],
] as const;

// The API takes a boolean here; OG's form posted '0' and '1'.
const RUNTIME = [[false, 'Automatically add the episode runtime'], [true, "Don't add the episode runtime"]] as const;

const id = (field: string) => `browsing-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
</script>

<SettingsPanel id="global" title="Global">
  <SettingsSelect id="browsing-watch-popup-action" label="Watch Buttons" bind:value={draft.watchPopupAction}
    options={settingOptions.watchPopupAction} />
  <SettingsCheck id="browsing-hide-watching-now" label="Hide Watching Now" bind:checked={draft.hideWatchingNow}>
    {#snippet help()}Hide the watching now option in the <b>Watch</b> button popup.{/snippet}
  </SettingsCheck>
  <SettingsSelect id="browsing-release-date-ignore-runtime" label="Release Date"
    bind:value={draft.releaseDateIgnoreRuntime} options={RUNTIME}>
    {#snippet help()}This affects the watch & library buttons when you choose <b>Release Date</b>.{/snippet}
  </SettingsSelect>
  <SettingsSelect id="browsing-list-popup-action" label="List Buttons" bind:value={draft.listPopupAction}
    options={settingOptions.listPopupAction} />
  <SettingsSelect id="browsing-watch-after-rating" label="Mark Watched After Rating" bind:value={draft.watchAfterRating}
    options={settingOptions.watchAfterRating}>
    {#snippet help()}This only applies to movies and episodes you haven't watched yet.{/snippet}
  </SettingsSelect>
  {#each TOGGLES as [field, label, text] (field)}
    <SettingsCheck id={id(field)} {label} bind:checked={draft[field]}>
      {#snippet help()}{text}{/snippet}
    </SettingsCheck>
  {/each}
</SettingsPanel>
