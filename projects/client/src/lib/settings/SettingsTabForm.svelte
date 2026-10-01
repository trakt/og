<!--
  The frame of a settings tab with one form of its own: the settings header
  with `current` highlighted, then the form and its "Save Settings". `save` sends what changed; a call that went
  through reloads the layout's settings, and then `onsaved` resets the form and OG's flash shows as a toast. A failed
  call keeps the form as typed and lists its message above the first section. A cookie the API refused renders the
  expired notice instead, while the browser renews the token.
-->
<script lang="ts">
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { login } from '$lib/auth/login';
import Container from '$lib/components/container/Container.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import SettingsErrors from '$lib/components/settings/SettingsErrors.svelte';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import SettingsSaveBar from '$lib/components/settings/SettingsSaveBar.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import type { Snippet } from 'svelte';
import type { SaveSettingsResult } from './saveSettings';

interface Props {
  /** The tab's path segment, as `SettingsHeader` matches it. */
  current: string;
  /** Whether there's a form to show: false for an expired session or an unexpected settings shape. */
  ready: boolean;
  save: () => Promise<SaveSettingsResult>;
  onsaved: () => void;
  children: Snippet;
}

const { current, ready, save, onsaved, children }: Props = $props();

let errors = $state<readonly string[]>([]);
let busy = $state(false);

async function onsubmit(event: SubmitEvent) {
  event.preventDefault();
  if (busy) return;

  busy = true;
  try {
    const result = await save();
    if (result.saved) await invalidateAll();
    errors = result.errors;
    if (result.errors.length) return;

    onsaved();
    toast.success('Your settings were saved!');
  } finally {
    busy = false;
  }
}
</script>

<SettingsHeader {current} />

<section class="tab">
  <Container>
    {#if !ready}
      <div class="notice"><NoData>Your session has expired. <a href={resolve('/settings')} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to change your settings.</NoData></div>
    {:else}
      <form {onsubmit} autocomplete="off">
        {#if errors.length}
          <div class="notice">{#key errors}<SettingsErrors {errors} />{/key}</div>
        {/if}
        {@render children()}
        <SettingsSaveBar {busy} />
      </form>
    {/if}
  </Container>
</section>

<style>
/* The first heading's top margin stays inside the white section instead of collapsing through it. */
.tab {
  display: flow-root;
}

/* The section headings bring their own top margin; a notice above them gets the same. */
.notice {
  padding-block-start: var(--settings-section-gap);
}
</style>
