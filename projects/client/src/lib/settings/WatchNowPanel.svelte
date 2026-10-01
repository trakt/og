<!--
  The Watch Now panel: the country, the favorite services as logo tiles with "Select your favorites",
  and Only Favorites. The location notice and Hide Watch Now Buttons are cut. Only
  Favorites is read only: sending it fails the whole save in API (`toSettingsPatch`), so the checkbox shows the
  saved value until the API is fixed.
-->
<script lang="ts">
import SettingsCheck from '$lib/components/settings/SettingsCheck.svelte';
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import SettingsInlineButton from '$lib/components/settings/SettingsInlineButton.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import SettingsSubheading from '$lib/components/settings/SettingsSubheading.svelte';
import ServiceTile from '$lib/components/watchnow/ServiceTile.svelte';
import Icon from '$lib/icons/Icon.svelte';
import arrow from '$lib/icons/solid/right-long.svg?raw';
import { favoriteKey } from './favoriteKey';
import { favoriteServices } from './favoriteServices';
import FavoriteServicesDialog from './FavoriteServicesDialog.svelte';
import { fetchCountrySources } from './fetchCountrySources';
import type { SettingsDraft } from './SettingsDraft';
import type { WatchNowChoices } from './WatchNowChoices';
import { SvelteSet } from 'svelte/reactivity';

interface Props {
  draft: SettingsDraft;
  choices: WatchNowChoices;
  /** A VIP's tiles link to search. */
  vip: boolean;
}

let { draft = $bindable(), choices, vip }: Props = $props();

// svelte-ignore state_referenced_locally
let sources = $state<WatchNowChoices['sources']>(choices.sources);
let picking = $state(false);
const loading = new SvelteSet<string>();

async function need(country: string) {
  if (sources[country] || loading.has(country)) return;
  loading.add(country);
  const loaded = await fetchCountrySources({ country });
  loading.delete(country);
  sources = { ...sources, [country]: loaded };
}

// A new country, or a pick from one, needs that country's logos.
$effect(() => {
  const countries = [
    draft.watchNowCountry,
    ...draft.watchNowFavorites.map((key) => favoriteKey(key, draft.watchNowCountry).country),
  ];
  for (const country of new Set(countries)) void need(country);
});

const tiles = $derived(
  favoriteServices({ favorites: draft.watchNowFavorites, country: draft.watchNowCountry, sources, vip }),
);
const listed = $derived(choices.countries.some(({ code }) => code === draft.watchNowCountry));
</script>

<SettingsPanel id="watchnow" title="Watch Now" instructions>
  {#snippet extra()}
    <SettingsPanelLink href="https://forums.trakt.tv/t/find-where-to-watch-tv-movies/19098" text="More Info" external />
  {/snippet}
  <SettingsSubheading sentence>This helps us provide streaming links to watch TV shows & movies.</SettingsSubheading>
  <SettingsField label="Country" id="browsing-watchnow-country">
    <select id="browsing-watchnow-country" bind:value={draft.watchNowCountry}>
      {#if !listed}<option value={draft.watchNowCountry}>{draft.watchNowCountry.toUpperCase()}</option>{/if}
      {#each choices.countries as { code, name } (code)}<option value={code}>{name}</option>{/each}
    </select>
  </SettingsField>
  <SettingsField label="Favorite Services" id="settings-watchnow-favorites" group>
    {#if tiles.length > 0}
      <ul class="services">
        {#each tiles as tile (tile.key)}<li><ServiceTile link={tile.link} country={tile.country} /></li>{/each}
      </ul>
    {/if}
    <SettingsInlineButton top onclick={() => (picking = true)}>
      Select your favorites <Icon svg={arrow} />
    </SettingsInlineButton>
  </SettingsField>
  <SettingsCheck id="browsing-watchnow-only-favorites" label="Only Favorites" checked={draft.watchNowOnlyFavorites}
    disabled vip>
    {#snippet help()}Only display ▶ icons if streaming on your favorite services.{/snippet}
  </SettingsCheck>
</SettingsPanel>

<FavoriteServicesDialog
  bind:open={picking}
  bind:favorites={draft.watchNowFavorites}
  home={draft.watchNowCountry}
  countries={choices.countries}
  {sources}
  onneed={(country) => void need(country)}
/>

<style>
.services {
  display: flex;
  flex-wrap: wrap;
  margin: var(--settings-services-margin);
  padding: 0;
  list-style: none;
  --service-width: var(--settings-service-width);
  --service-height: var(--settings-service-height);
  --service-padding: var(--settings-service-padding);
}
</style>
