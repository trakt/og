<!-- OG's feed icon and URL popover, with native light-dismiss and keyboard focus handling. -->
<script lang="ts">
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import calendarArrowDown from '$lib/icons/thin/calendar-arrow-down.svg?raw';

interface Props {
  isVip: boolean;
  url: string | null;
  label?: string;
}
const { isVip, url, label = 'iCal Feed' }: Props = $props();
const id = $props.id();
let button = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let expanded = $state(false);

function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector<HTMLElement>('a, p[tabindex]')?.focus({ preventScroll: true });
  else button?.focus({ preventScroll: true });
}
</script>

<!-- The upsell route is not built yet; the feed URL is an external API subscription. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<span class="feed" style:anchor-name="--feed-{id}">
  <Tooltip text={expanded ? undefined : 'iCal Feed'}>
    {#snippet trigger(tip)}
      {#if isVip}
        <button bind:this={button} type="button" class="trigger" aria-label={label}
          aria-haspopup="dialog" aria-expanded={expanded} aria-controls="feed-{id}"
          popovertarget="feed-{id}" {...tip}><Icon svg={calendarArrowDown} /></button>
      {:else}
        <a class="trigger" href="/vip/feeds" aria-label={label} {...tip}><Icon svg={calendarArrowDown} /></a>
      {/if}
    {/snippet}
  </Tooltip>
</span>
{#if isVip}
  <div bind:this={popover} id="feed-{id}" class="popover" popover="auto" role="dialog"
  aria-labelledby="feed-title-{id}" style:position-anchor="--feed-{id}" ontoggle={toggle}>
  <h3 id="feed-title-{id}">
      <span class="badge"><VipLabel badge={{ kind: 'vip', years: null, tag: null }} /></span>
      <Icon svg={calendarArrowDown} /> iCal Feed
    </h3>
  <div class="body">
      <p>Copy this URL and use it in Apple iCal, Google Calendar, Outlook, or your favorite calendar app.</p>
      {#if url}
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      {:else}
        <p tabindex="-1">Your feed URL is unavailable. Reload the page to try again.</p>
      {/if}
    </div>
</div>
{/if}

<style>
.feed {
  display: inline-block;
}
.trigger {
  display: inline-block;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-frame-heading);
  font-size: var(--feed-icon-size);
  line-height: 1;
  vertical-align: top;
  cursor: pointer;
  &:is(:hover, :focus-visible) {
    color: var(--color-text-inverse);
  }
}
.popover {
  position: fixed;
  position-area: bottom;
  inset: auto;
  inline-size: var(--feed-popover-width);
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--rating-popover-gap) 0;
  padding: 0;
  overflow: visible;
  border: var(--rating-popover-border-width) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-feed-text);
  box-shadow: var(--shadow-rating-popover);
  font: var(--font-size-base) / var(--line-height-base) var(--font-body);
  text-align: start;
  &::before {
    content: '';
    position: absolute;
    inset-block-end: 100%;
    inset-inline-start: calc(50% - var(--feed-arrow-size));
    border: var(--feed-arrow-size) solid transparent;
    border-block-end-color: var(--color-feed-title);
  }
}
h3 {
  margin: 0;
  padding: var(--feed-title-block) var(--rating-prompt-inline);
  border-block-end: var(--rating-popover-border-width) solid var(--color-feed-divider);
  background: var(--color-feed-title);
  font: inherit;
  line-height: var(--feed-title-line);
  & :global(.icon) {
    margin-inline-end: var(--feed-title-icon-gap);
    font-size: var(--feed-title-icon-size);
    vertical-align: bottom;
  }
}
.badge {
  float: inline-end;
  margin: var(--feed-badge-top) var(--feed-badge-end) 0 0;
}
.body {
  padding: var(--rating-popover-body-block) var(--rating-popover-body-inline);
}
p {
  margin: 0 0 var(--feed-paragraph-gap);
}
.body > :last-child {
  margin-block-end: 0;
}
a {
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: no-preference) {
  .trigger {
    transition: color var(--transition-frame);
  }
}
</style>
