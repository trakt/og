<script lang="ts">
import '$lib/styles/tokens.css';
import '$lib/styles/base.css';
import { invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import { syncSession } from '$lib/auth/syncSession';
import { userManager } from '$lib/auth/userManager';
import CheckinDialog from '$lib/components/checkin/CheckinDialog.svelte';
import { startCommentReactions } from '$lib/components/comments/startCommentReactions';
import Footer from '$lib/components/footer/Footer.svelte';
import Header from '$lib/components/header/Header.svelte';
import Toaster from '$lib/components/toast/Toaster.svelte';
import { startOverlay } from '$lib/overlay/startOverlay';
import { toDarkKnight } from '$lib/settings/toDarkKnight';
import { toTheme } from '$lib/settings/toTheme';
import { onMount } from 'svelte';

let { children, data } = $props();

// The coming-soon placeholder at `/` and the design-system demos draw their own page.
const bare = $derived(page.route.id === '/' || page.route.id?.startsWith('/_design'));

// The server renders the saved theme onto <html> (hooks.server.ts); this keeps it in step when the settings reload.
// The demos pick their own theme.
const darkKnight = $derived(toDarkKnight(data.settings));
const theme = $derived(toTheme(darkKnight));
$effect(() => {
  if (!bare) document.documentElement.dataset.theme = theme;
});

onMount(() => {
  const manager = userManager();
  const stopSession = syncSession({ manager, hasSession: data.hasSession, reload: invalidateAll });
  const stopOverlay = startOverlay(manager);
  const stopReactions = startCommentReactions(manager);

  return () => {
    stopSession();
    stopOverlay();
    stopReactions();
  };
});
</script>

{#if bare}
  {@render children()}
{:else}
  <a class="skip" href="#content">Skip to content</a>
  <Header user={data.user} searchType={data.searchType} {darkKnight} />
  <main id="content" tabindex="-1">
    {@render children()}
  </main>
  <Footer username={data.user?.slug ?? null} />
{/if}
<Toaster />
<CheckinDialog />

<style>
/* Off-screen until focused, then over the fixed header's logo. */
.skip {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: calc(var(--z-header) + 1);
  padding: var(--space-lg-block) var(--space-lg-inline);
  background: var(--color-surface);
  translate: 0 -100%;

  &:focus {
    translate: none;
  }
}

main:focus {
  outline: none;
}
</style>
