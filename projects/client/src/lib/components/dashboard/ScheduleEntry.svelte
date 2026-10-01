<!--
  One entry in an Upcoming Schedule day: the show or movie title, then an
  episode's number and title, its premiere or finale label, air time and network, or a movie's tagline, and a Watch
  Now link when there's somewhere to watch it. A show's later episode on the same day drops its title and air time,
  as OG's `same-show` did; its title stays for screen readers.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';
import type { ScheduleItem } from '$lib/dashboard/ScheduleItem';
import Icon from '$lib/icons/Icon.svelte';
import play from '$lib/icons/trakt/play2-thick.svg?raw';
import tickets from '$lib/icons/trakt/tickets.svg?raw';

interface Props {
  item: ScheduleItem;
  /** The day's first entry has no line above it. */
  first: boolean;
  onwatchnow: (watchNow: NonNullable<ScheduleItem['watchNow']>) => void;
  /** The pointer or focus came in: its day shows this entry's poster. */
  onactivate?: () => void;
}

const { item, first, onwatchnow, onactivate }: Props = $props();

const activates = (activate: () => void): Attachment<HTMLElement> => (node) => {
  node.addEventListener('pointerenter', activate);
  node.addEventListener('focusin', activate);
  return () => {
    node.removeEventListener('pointerenter', activate);
    node.removeEventListener('focusin', activate);
  };
};
</script>

<!-- The popular shows page takes a network filter og hasn't built yet; resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class={['entry', { first, 'same-show': item.sameShow }]} {@attach onactivate && activates(onactivate)}>
  <h4><a href={item.href}>{item.title}</a></h4>
  {#if item.episode}
    <h5>
      <a href={item.episode.href}><span class="number">{item.episode.number}</span>{item.episode.title ? ` ${item.episode.title}` : ''}</a>
    </h5>
    <h6>
      {#if item.label}
        <span class="label" style:--episode-color="var(--episode-{item.label.kind})">{item.label.label}</span>
      {/if}
      <span class="aired">{item.time}{item.network ? ' on ' : ''}{#if item.network?.href}<a href={item.network.href}>{item.network.name}</a>{:else}{item.network?.name}{/if}</span>
    </h6>
  {:else if item.tagline}
    <h6 class="tagline">{item.tagline}</h6>
  {/if}
  {#if item.watchNow}
    {@const watchNow = item.watchNow}
    <button type="button" class={['watch-now', { tickets: watchNow.button.cinemaOnly }]} aria-haspopup="dialog"
      onclick={() => onwatchnow(watchNow)}>
      <span class="icon"><Icon svg={watchNow.button.cinemaOnly ? tickets : play} /></span>
      {watchNow.button.cinemaOnly ? 'Buy Tickets' : 'Watch Now'}
    </button>
  {/if}
</div>

<style>
.entry {
  overflow-wrap: break-word;

  &:not(.first) {
    margin-block-start: var(--space-schedule-entry);
    padding-block-start: var(--space-schedule-entry);
    border-block-start: 1px solid var(--color-schedule-separator);
  }

  &.same-show:not(.first) {
    margin-block-start: var(--space-schedule-same-show);
    padding-block-start: 0;
    border: 0;
  }
}

h4 {
  margin: 0 0 var(--space-schedule-line);
  font-size: var(--font-size-h4);
}

h5 {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-h5);

  & a {
    color: inherit;
  }
}

.number {
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
}

h6 {
  margin: var(--space-schedule-line) 0 0;

  & a {
    color: inherit;
  }
}

.label {
  display: inline-block;
  margin: 0 var(--space-schedule-line) var(--space-schedule-line) 0;
  padding: var(--schedule-tag-padding);
  background-color: var(--episode-color);
  color: var(--color-text-inverse);
  font-size: var(--font-size-schedule-tag);
}

.aired {
  display: block;
}

.same-show :is(h4, h6) {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.watch-now {
  display: inline-block;
  margin: var(--space-schedule-line) 0 0 calc(var(--space-schedule-tag-nudge) * -1);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-headings);
  font-size: var(--font-size-schedule-tag);
  line-height: var(--line-height-base);
  text-transform: uppercase;
  cursor: pointer;

  &.tickets {
    margin-inline-start: 0;
  }
}

.icon {
  display: inline-block;
  margin-inline-end: var(--space-schedule-watch-now-icon);
  font-size: var(--font-size-schedule-watch-now-icon);
  line-height: 1;
  vertical-align: top;

  .tickets & {
    margin-inline-end: var(--space-schedule-tickets-icon);
  }
}
</style>
