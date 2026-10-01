<!--
  Sharing settings: "Localize how you share" and the Sharing text panel, with
  one "Save Settings". Connecting social networks, the per-network sharing toggles and the Mastodon settings have no
  API, so og leaves them out.
-->
<script lang="ts">
import SettingsField from '$lib/components/settings/SettingsField.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import comments from '$lib/icons/thin/comments.svg?raw';
import { saveSettingsBody } from './saveSettingsBody';
import type { SharingDraft } from './SharingDraft';
import SettingsTabForm from './SettingsTabForm.svelte';
import { toSharingDraft } from './toSharingDraft';
import { toSharingPatch } from './toSharingPatch';

interface Props {
  data: { settings: unknown; expired: boolean };
  /** Sends the changes. The demo route passes one that doesn't touch the API. */
  save?: typeof saveSettingsBody;
}

const { data, save = saveSettingsBody }: Props = $props();

const saved = $derived(toSharingDraft(data.settings));
// svelte-ignore state_referenced_locally
let draft = $state<SharingDraft | null>(saved && { ...saved });

const FIELDS = [
  { key: 'watching', label: 'Start Watching', placeholder: "I'm watching...", help: 'what you started watching.' },
  { key: 'watched', label: 'Just Watched', placeholder: 'I just watched...', help: 'what you just watched.' },
  { key: 'rated', label: 'Just Rated', placeholder: 'I just rated...', help: 'what you just rated' },
] as const;
</script>

<svelte:head>
  <title>Sharing Settings - Trakt</title>
  <meta name="description" content="Customize the text Trakt shares when you watch and rate." />
</svelte:head>

<SettingsTabForm
  current="sharing"
  ready={!data.expired && draft !== null}
  save={() => save(saved && draft ? toSharingPatch({ before: saved, after: draft }) : null)}
  onsaved={() => (draft = saved && { ...saved })}
>
  {#if draft}
    <SettingsSectionHeading
      icon={comments}
      help="Customize the text for watching, scrobbles, checkins, and ratings for Mastodon, Twitter & Tumblr. Hashtags are automatically added for the movie and TV show title."
    >
      {#snippet title()}Localize how you share{/snippet}
    </SettingsSectionHeading>
    <SettingsPanel id="sharing-text" title="Sharing text">
      {#each FIELDS as field (field.key)}
        <SettingsField label={field.label} id="sharing-text-{field.key}" wide>
          {#snippet help()}
            The <strong>[item]</strong> text is replaced with {field.help}
            {#if field.key === 'rated'}and <strong>[stars]</strong> is replaced with your rating.{/if}
          {/snippet}
          <input
            type="text"
            id="sharing-text-{field.key}"
            aria-describedby="sharing-text-{field.key}-help"
            placeholder={field.placeholder}
            required
            bind:value={draft[field.key]}
          />
        </SettingsField>
      {/each}
    </SettingsPanel>
  {/if}
</SettingsTabForm>
