<!--
  The Spoilers panel: what to hide on unwatched episodes, shows and movies, then comments, ratings and actors.
-->
<script lang="ts">
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
import SettingsSubheading from '$lib/components/settings/SettingsSubheading.svelte';
import type { SettingsDraft } from './SettingsDraft';
import { settingOptions } from './settingOptions';

let { draft = $bindable() }: { draft: SettingsDraft } = $props();

type Spoiler =
  | 'episodeSpoilers'
  | 'showSpoilers'
  | 'movieSpoilers'
  | 'commentSpoilers'
  | 'ratingSpoilers'
  | 'actorSpoilers';

// The rule splits the unwatched items from the rest, as OG's <hr> did.
const GROUPS: ReadonlyArray<ReadonlyArray<readonly [Spoiler, string, string]>> = [
  [
    ['episodeSpoilers', 'Episodes', 'browsing-spoilers-episodes'],
    ['showSpoilers', 'Shows', 'browsing-spoilers-shows'],
    ['movieSpoilers', 'Movies', 'browsing-spoilers-movies'],
  ],
  [
    ['commentSpoilers', 'Comments', 'browsing-spoilers-comments'],
    ['ratingSpoilers', 'Ratings', 'browsing-spoilers-ratings'],
    ['actorSpoilers', 'Actors', 'browsing-spoilers-actors'],
  ],
];
</script>

<SettingsPanel id="spoilers" title="Spoilers" instructions>
  {#snippet extra()}
    <SettingsPanelLink href="https://forums.trakt.tv/t/no-spoilers/19100" text="More Info" external />
  {/snippet}
  <SettingsSubheading sentence>
    These settings apply to all unwatched episodes, shows, seasons, and movies throughout the site.
  </SettingsSubheading>
  {#each GROUPS as fields, index (index)}
    {#if index > 0}<hr />{/if}
    {#each fields as [field, label, id] (field)}
      <SettingsSelect {id} {label} bind:value={draft[field]} options={settingOptions[field]} />
    {/each}
  {/each}
</SettingsPanel>
