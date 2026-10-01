<!--
  OG's check-in modal: the logo or title, the episode screenshot (or movie fanart),
  a message prefilled from the viewer's sharing text, and Check In. The page behind blurs to the item's fanart. The X,
  Mastodon and Tumblr toggles are cut: those integrations are gone. Mounted once in the root layout; open it with
  `checkin.open` from `./checkin.svelte.ts`.
-->
<script lang="ts">
import { page } from '$app/state';
import { invalidateAll } from '$app/navigation';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import Spinner from '$lib/components/loading/Spinner.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import { checkin } from '$lib/components/checkin/checkin.svelte';
import { checkinMedia } from '$lib/components/checkin/checkinMedia';
import { formatDate } from '$lib/utils/formatDate';

const target = $derived(checkin.target);
const shot = $derived(target?.episode ? target.episode.screenshot : target?.fanart);
let message = $state('');
let busy = $state(false);

// Each opening starts from the template again, like OG.
$effect.pre(() => {
  if (!target) return;
  message = (page.data.settings?.sharing_text?.watching ?? '').replace('[item]', target.fullTitle);
  busy = false;
});

const request = (path: string, body?: unknown) =>
  rawApiFetch({
    fetch: authenticatedFetch({ manager: userManager() }),
    path,
    init: body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (!target || busy) return;
  busy = true;
  const started = await checkinMedia({ target, message, request, notify: toast });
  // OG left the spinner up for a second before closing, success or not.
  setTimeout(() => checkin.close(), 1000);
  // The profile's watching-now bar is server-rendered.
  if (started && page.route.id?.startsWith('/users/')) void invalidateAll();
}
</script>

<Dialog open={target !== null} title="Check in" backdrop={target?.fanart} onclose={() => checkin.close()}>
  {#snippet header(id)}
    <h2 {id} class={['heading', { logo: target?.logo }]}>
      {#if target?.logo}<img src={target.logo} alt={target.topTitle} />{:else}{target?.topTitle}{/if}
    </h2>
  {/snippet}
  {#if target}
    <form onsubmit={submit} aria-busy={busy}>
      {#if target.episode && !shot}<p class="episode">{target.episode.number} {target.episode.title}</p>{/if}
      {#if shot}
        <div class="fanart">
          <img src={shot} alt="" />
          <span class="shadow-base"></span>
          {#if target.episode}
            <div class="titles">
              {#if target.episode.firstAired}
                <p class="tag">{formatDate(target.episode.firstAired, { ...page.data.datePreferences, format: 'll', time: true })}</p>
              {/if}
              <p class="title"><span class="number">{target.episode.number}</span> {target.episode.title}</p>
            </div>
          {/if}
        </div>
      {/if}
      <!-- svelte-ignore a11y_autofocus -->
      <textarea bind:value={message} aria-label="Check in message" placeholder="Write a check in message..." rows="3" autofocus></textarea>
      <button type="submit" class="submit" aria-disabled={busy}>
        {#if busy}<Spinner label="Checking in" />{:else}Check In{/if}
      </button>
    </form>
  {/if}
</Dialog>

<style>
.heading {
  margin: var(--checkin-heading-top) var(--space-dialog-wide-inline) 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-checkin-heading);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);

  &.logo {
    margin-block-start: var(--space-panel);
    min-block-size: var(--checkin-logo-height);
  }

  & img {
    display: block;
    inline-size: 100%;
  }
}

form {
  padding: 0 var(--space-dialog-wide-inline) var(--space-dialog-inline);
}

.episode {
  margin: var(--space-panel) 0 0;
  font-size: var(--font-size-checkin-episode);
  text-align: center;
}

.fanart {
  position: relative;
  margin: var(--space-panel) calc(-1 * var(--space-dialog-wide-inline)) 0;
  overflow: hidden;
  border-block: 1px solid var(--color-checkin-fanart-border);
  background-color: var(--color-card-bg);

  & img {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-fanart);
    object-fit: cover;
  }
}

.shadow-base {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: var(--checkin-shadow-height);
  background: var(--gradient-shadow-base);
}

.titles {
  position: absolute;
  inset-block-end: 10px;
  inset-inline: 12px;
  color: var(--color-card-text);
  font-family: var(--font-headings);
  line-height: var(--line-height-headings);
}

.tag {
  display: inline-block;
  margin: 0 0 5px;
  padding: 3px 5px;
  background-color: var(--brand-primary);
  font-size: var(--font-size-card-tag);
  font-weight: var(--font-weight-headings);
}

.title {
  margin: 0;
  font-size: var(--font-size-fanart-title);
  font-weight: var(--font-weight-headings);
  text-shadow: var(--text-shadow-headings);
}

.number {
  font-weight: var(--font-weight-headings-heavy);
}

textarea {
  display: block;
  inline-size: 100%;
  margin-block-start: var(--gutter);
  padding: var(--checkin-message-padding);
  font-size: var(--font-size-checkin-message);
  resize: vertical;
}

.submit {
  display: grid;
  place-items: center;
  inline-size: 100%;
  margin-block-start: var(--gutter);
  padding: var(--space-lg-block) var(--space-lg-inline);
  border-color: var(--color-btn-primary-border);
  border-radius: var(--radius-checkin-submit);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-submit);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
