<!--
  The Account panel. Gender is cut: the API reads it but can't write it. OG focused the
  username on load; og doesn't, so a screen reader starts at the top of the page.
-->
<script lang="ts">
import AvatarPicker from '$lib/components/settings/AvatarPicker.svelte';
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import { birthdayYears } from './birthdayYears';
import type { SettingsDraft } from './SettingsDraft';

interface Props {
  draft: SettingsDraft;
  avatar: string;
  onavatar: (dataUri: string) => void;
  /** The year the birthday's years count back from. */
  year: number;
  /** Whether the API sent the email, so the field has one to keep. */
  emailKnown: boolean;
}

let { draft = $bindable(), avatar, onavatar, year, emailKnown }: Props = $props();

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
const years = $derived(birthdayYears({ year, saved: draft.birthYear }));
</script>

<SettingsPanel id="account" title="Account">
  <SettingsField label="Avatar" id="settings-avatar" group tall>
    <AvatarPicker id="settings-avatar" src={avatar} onpick={onavatar} />
  </SettingsField>
  <SettingsField label="Private" id="user-private" check>
    {#snippet help()}Hide all your profile data.{/snippet}
    <input type="checkbox" id="user-private" aria-describedby="user-private-help" bind:checked={draft.private} />
  </SettingsField>
  <SettingsField label="Username" id="user-username">
    <input type="text" id="user-username" placeholder="Username" autocomplete="username" required
      bind:value={draft.username} />
  </SettingsField>
  <SettingsField label="Email" id="user-email">
    <input type="email" id="user-email" placeholder="user@domain.com" autocomplete="email" required={emailKnown}
      bind:value={draft.email} />
  </SettingsField>
  <SettingsField label="Display Name" id="user-name">
    <input type="text" id="user-name" placeholder="Display name" autocomplete="name" bind:value={draft.name} />
  </SettingsField>
  <SettingsField label="Location" id="user-location">
    <input type="text" id="user-location" placeholder="Location" bind:value={draft.location} />
  </SettingsField>
  <SettingsField label="About Me" id="user-about">
    <textarea id="user-about" placeholder="About" rows="5" bind:value={draft.about}></textarea>
  </SettingsField>
  <SettingsField label="Birthday" id="user-dob" group>
    <select class="inline" aria-label="Month" bind:value={draft.birthMonth}>
      <option value=""></option>
      {#each MONTHS as month, index (month)}<option value={String(index + 1)}>{month}</option>{/each}
    </select>
    <select class="inline" aria-label="Day" bind:value={draft.birthDay}>
      <option value=""></option>
      {#each days as day (day)}<option value={day}>{day}</option>{/each}
    </select>
    <select class="inline" aria-label="Year" bind:value={draft.birthYear}>
      <option value=""></option>
      {#each years as option (option)}<option value={option}>{option}</option>{/each}
    </select>
  </SettingsField>
  <SettingsField label="Display Age" id="user-display-dob" check>
    {#snippet help()}Display your age on your profile page.{/snippet}
    <input type="checkbox" id="user-display-dob" aria-describedby="user-display-dob-help" bind:checked={draft.displayAge} />
  </SettingsField>
</SettingsPanel>

<style>
.inline {
  inline-size: auto;
  margin-inline-end: var(--settings-select-gap);
}
</style>
