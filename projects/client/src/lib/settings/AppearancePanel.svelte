<!--
  The Appearance panel: Dark Knight Mode. Picking an option switches the page at once and saves it without
  waiting for "Save Settings", as OG did . OG folds the panel for non-VIPs. `cut:` the Theme
  picker (purple or red): og is always the red theme.
-->
<script lang="ts">
import { invalidateAll } from '$app/navigation';
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsPanelLink from '$lib/components/settings/SettingsPanelLink.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import type { DarkKnight } from './DarkKnight';
import type { SaveSettingsResult } from './saveSettings';
import { setDarkKnight } from './setDarkKnight';
import type { SettingsBody } from './toSettingsPatch';

interface Props {
  /** The saved setting. */
  darkKnight: DarkKnight;
  vip: boolean;
  save: (body: SettingsBody) => Promise<SaveSettingsResult>;
}

const { darkKnight: saved, vip, save }: Props = $props();

const OPTIONS: ReadonlyArray<readonly [DarkKnight, string]> = [
  ['false', 'Off'],
  ['true', 'On'],
  ['auto', 'Auto (uses your system appearance setting)'],
];

// The select shows the pick while it saves, then the saved setting once the layout reloads.
let darkKnight = $derived(saved);

async function onchange(event: Event & { currentTarget: HTMLSelectElement }) {
  const value = OPTIONS.find(([option]) => option === event.currentTarget.value)?.[0];
  if (!value) return;

  const before = darkKnight;
  darkKnight = value;
  const done = await setDarkKnight({
    value,
    save,
    reload: invalidateAll,
    notify: toast.error,
    root: document.documentElement,
  });
  if (!done) darkKnight = before;
}
</script>

<SettingsPanel id="appearance" title="Appearance" collapsed={!vip}>
  {#snippet extra()}
    <SettingsPanelLink href="https://forums.trakt.tv/t/dark-knight-mode/19089" text="More Info" external />
  {/snippet}
  <SettingsField label="Dark Knight Mode" id="browsing-dark-knight">
    <select id="browsing-dark-knight" aria-describedby="browsing-dark-knight-help" value={darkKnight} {onchange}>
      {#each OPTIONS as [value, label] (value)}<option {value}>{label}</option>{/each}
    </select>
    {#snippet help()}Dark theme for the entire Trakt website.{/snippet}
  </SettingsField>
</SettingsPanel>
