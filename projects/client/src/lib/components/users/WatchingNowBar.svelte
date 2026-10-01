<!--
  OG's watching-now bar: a red strip along the bottom of the profile cover while the
  owner is checked in or scrobbling. The darker fill runs from the start to the end of the runtime, with the elapsed
  time, the runtime and the percentage in big faded numbers, and it ticks every second. At 100% it fades out.
  Put it inside a positioned cover.
-->
<script lang="ts">
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import circleXmark from '$lib/icons/solid/circle-xmark.svg?raw';
import type { WatchingNow } from '$lib/users/WatchingNow';
import { watchingProgress } from '$lib/users/watchingProgress';

interface Props {
  watching: WatchingNow;
  /** Whose profile it is: "Sean is watching", or "You are watching" on your own. */
  owner: { readonly firstName: string; readonly href: string } | 'self';
}

const { watching, owner }: Props = $props();

let now = $state(Date.now());
const progress = $derived(watchingProgress({ endsAt: watching.endsAt, runtime: watching.runtime, now }));

$effect(() => {
  if (progress.done) return;
  const timer = setInterval(() => (now = Date.now()), 1000);
  return () => clearInterval(timer);
});

// Only your own check-in can be cancelled; a scrobble ends when the player stops.
const cancellable = $derived(owner === 'self' && watching.action === 'checkin');
let cancelled = $state(false);
let cancelling = false;
async function cancel() {
  if (cancelling) return;
  cancelling = true;
  const response = await rawApiFetch({
    fetch: authenticatedFetch({ manager: userManager() }),
    path: '/checkin',
    init: { method: 'DELETE' },
  }).catch(() => null);
  cancelling = false;
  if (response?.ok) {
    cancelled = true;
    const episode = watching.episode
      ? ` ${watching.episode.number}${watching.episode.title ? ` "${watching.episode.title}"` : ''}`
      : '';
    toast.success(`You cancelled your check in for ${watching.title}${episode}.`);
  } else if (response?.status !== 429) toast.error('Doh! We ran into some sort of error.');
}

// OG hid the elapsed time until the fill was wide enough to hold it.
let barWidth = $state(0);
let elapsedWidth = $state(0);
</script>

<!-- Links point at media and profile pages other issues build; resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class={['watching-now', { done: progress.done, cancelled }]} inert={cancelled}>
  {#if cancellable}
    <Tooltip text="Cancel" placement="bottom">
      {#snippet trigger(tip)}
        <button type="button" class="cancel" aria-label="Cancel check in" onclick={cancel} {...tip}><Icon svg={circleXmark} /></button>
      {/snippet}
    </Tooltip>
  {/if}
  <div class={['runtime', { 'with-cancel': cancellable }]} aria-hidden="true">{progress.runtime}</div>
  <div
    class="progress-bar"
    style:inline-size="{progress.percent}%"
    bind:clientWidth={barWidth}
    role="progressbar"
    aria-label="Watched so far"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.floor(progress.percent)}
  >
    <div class="elapsed" aria-hidden="true" hidden={elapsedWidth > barWidth + 10} bind:clientWidth={elapsedWidth}>
      {progress.elapsed}
    </div>
    <div class="percentage" aria-hidden="true">{Math.floor(progress.percent)}%</div>
  </div>
  <div class="info">
    <p class="who">
      {#if owner === 'self'}
        You are watching
      {:else}
        <a href={owner.href}>{owner.firstName}</a> is watching
      {/if}
    </p>
    <p class="what">
      <a href={watching.href}>
        <strong>{watching.title}</strong>
        {#if watching.episode}
          <span class="sxe">{watching.episode.number}</span>
          {#if watching.episode.title}"{watching.episode.title}"{/if}
        {/if}
      </a>
    </p>
  </div>
</div>

<style>
.watching-now {
  position: absolute;
  inset-block-end: 0;
  inline-size: 100%;
  block-size: var(--profile-watching-height);
  overflow: hidden;
  background-color: var(--color-watching-bg);
  font-size: 1.1em;
  transition: all 0.5s;

  &.done {
    opacity: 0;
  }

  &.cancelled {
    block-size: 0;
    opacity: 0;
  }

  & a {
    color: var(--color-text-inverse);
  }
}

.runtime,
.elapsed,
.percentage {
  position: absolute;
  inset-block-start: 0;
  color: var(--color-watching-numbers);
  font-family: var(--font-headings);
  font-size: var(--font-size-watching-numbers);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--profile-watching-height);
  white-space: nowrap;
}

.runtime {
  inset-inline-end: 15px;

  &.with-cancel {
    inset-inline-end: var(--watching-runtime-cancel-end);
  }
}

.cancel {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 15px;
  z-index: 15;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-watching-numbers);
  font-size: var(--font-size-watching-cancel);
  line-height: var(--watching-cancel-line);
  transition: all 0.5s;

  &:is(:hover, :focus-visible) {
    color: var(--color-watching-cancel-hover);
  }
}

.progress-bar {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  z-index: 5;
  block-size: 100%;
  max-inline-size: 100%;
  background-color: var(--color-watching-progress);
  transition: all 0.5s;
}

.elapsed {
  inset-inline-start: 15px;
  margin-inline-end: 60px;
}

.percentage {
  inset-inline-end: 0;
  padding-inline: 80px 15px;
  background: var(--gradient-watching-percentage);
}

.info {
  position: absolute;
  inset: 0;
  z-index: 10;
  padding: 15px 0;
  text-align: center;

  & p {
    margin: 0;
    color: var(--color-text-inverse);
    font-family: var(--font-headings);
    line-height: var(--line-height-headings);
  }
}

.info .who {
  margin-block-end: 5px;
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}

.info .what {
  font-size: var(--font-size-watching-title);
  font-weight: var(--font-weight-headings);

  & :is(strong, .sxe) {
    font-weight: var(--font-weight-headings-heavy);
  }

  & .sxe {
    margin-inline-start: 6px;
  }
}
</style>
