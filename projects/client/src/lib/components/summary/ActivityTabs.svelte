<!--
  OG's "People You Follow": big-number tabs over a box of round avatars.
  One row of avatars shows until "+N more" opens the rest. A follower's rating colours their ring and adds the corner
  badge, and the watched tab's tooltips add the play count. Private members watching now get the placeholder avatar
  and no link. An ARIA tablist: arrow keys, Home and End move between the tabs.
-->
<script lang="ts">
import { tick } from 'svelte';
import CornerRating from '$lib/components/media/CornerRating.svelte';
import { nextTab } from '$lib/components/tabs/nextTab';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';
import type { ActivityTab, ActivityUser } from '$lib/summary/toActivity';
import { countLabel } from '$lib/utils/countLabel';

interface Props {
  tabs: readonly ActivityTab[];
}

const { tabs }: Props = $props();
const id = $props.id();

// svelte-ignore state_referenced_locally
let selected = $state(tabs[0]?.id);
let expanded = $state(false);
let width = $state(0);
let panel = $state<HTMLElement>();

const tab = $derived(tabs.find((candidate) => candidate.id === selected) ?? tabs[0]);
// OG's col-md-1: twelve avatars a row, six on phones and tablets.
const perRow = $derived(width > 0 && width < 720 ? 6 : 12);
const users = $derived(tab?.users ?? []);
const collapsed = $derived(!expanded && users.length > perRow);
// "+N more" takes the last spot in the row, so it counts the avatar it covers.
const shown = $derived(collapsed ? users.slice(0, perRow - 1) : users);

// The button goes away, so focus moves on to the first avatar it was hiding.
const expand = async () => {
  const first = shown.length;
  expanded = true;
  await tick();
  panel?.querySelectorAll<HTMLElement>('.users > li > :first-child').item(first)?.focus();
};

const select = (next: ActivityTab['id']) => {
  selected = next;
  expanded = false;
};

function onkeydown(event: KeyboardEvent) {
  const target = nextTab(tabs.map((candidate) => candidate.id), selected, event.key);
  if (target === undefined) return;

  event.preventDefault();
  select(target as ActivityTab['id']);
  document.getElementById(`${id}-tab-${target}`)?.focus();
}
</script>

{#snippet avatar(user: ActivityUser)}
  <span class="user-avatar" style:--ring={user.rating ? `var(--rating-${user.rating})` : undefined}>
    {#if user.rating}
      <span class="block"></span>
      <CornerRating rating={user.rating} label="Rated {user.rating}" />
    {/if}
    <img src={user.avatar} alt="" loading="lazy" decoding="async" />
  </span>
{/snippet}

<!-- Profiles og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section class="summary-activity" aria-labelledby="{id}-heading">
  <h2 id="{id}-heading">People You Follow</h2>
  <div class="tabs" role="tablist" aria-labelledby="{id}-heading">
    {#each tabs as candidate (candidate.id)}
      <button
        type="button"
        role="tab"
        id="{id}-tab-{candidate.id}"
        class="tab"
        aria-controls="{id}-panel"
        aria-selected={candidate.id === tab?.id}
        tabindex={candidate.id === tab?.id ? 0 : -1}
        style:--heart={candidate.heart ? `var(--rating-${candidate.heart})` : undefined}
        onclick={() => select(candidate.id)}
        {onkeydown}
      >
        <span class="number">
          {#if candidate.heart}
            <Icon svg={heart} label="Average rating" />{candidate.number}<span class="percent-sign">%</span>
          {:else}
            {candidate.number}
          {/if}
        </span>
        <span class="text">{candidate.text[0]}<br />{candidate.text[1]}</span>
      </button>
    {/each}
  </div>
  {#if tab}
    <div
      id="{id}-panel"
      class="users-wrapper"
      role="tabpanel"
      aria-labelledby="{id}-tab-{tab.id}"
      bind:clientWidth={width}
      bind:this={panel}
      style:--per-row={perRow}
    >
      <ul class="users">
        {#each shown as user (user.key)}
          <li>
            {#if user.href}
              <Tooltip placement="bottom">
                {#snippet trigger(tooltip)}
                  <a href={user.href} aria-label={user.name} {...tooltip}>{@render avatar(user)}</a>
                {/snippet}
                <span class="line">{user.name}</span>
                {#if user.plays}
                  <span class="divider"></span>
                  <span class="line">{countLabel(user.plays, 'play')}</span>
                {/if}
              </Tooltip>
            {:else}
              <span role="img" aria-label="Private member" tabindex="-1">{@render avatar(user)}</span>
            {/if}
          </li>
        {/each}
        {#if collapsed}
          <li>
            <button type="button" class="plus-more" aria-label="Show {users.length - shown.length} more" onclick={expand}>
              <span class="more-number">+{users.length - shown.length}</span>
              more
            </button>
          </li>
        {/if}
      </ul>
    </div>
  {/if}
</section>

<style>
.summary-activity {
  margin-block-start: var(--gutter);

  & h2 {
    margin-block-end: var(--gutter);
  }
}

.tabs {
  position: relative;
  z-index: 1;
  display: flex;
}

.tab {
  display: flex;
  flex: 0 0 25%;
  align-items: flex-start;
  min-inline-size: 0;
  margin: 0;
  padding: var(--activity-tab-padding);
  border: 1px solid var(--color-activity-border);
  border-radius: 0;
  background: none;
  color: var(--color-activity-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;
  text-align: start;
  transition: all var(--transition-card);

  & > * {
    opacity: var(--opacity-activity-idle);
    transition: opacity var(--transition-card);
  }

  &:not(:first-child) {
    border-inline-start: none;
  }

  &[aria-selected='true'] {
    border-block-end-color: var(--color-activity-bg);
    background-color: var(--color-activity-bg);

    & > * {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: -2px;
  }
}

.number {
  font-size: var(--font-size-activity-number);
  font-weight: var(--font-weight-headings);
  white-space: nowrap;

  & :global(.icon) {
    margin-block-start: 3px;
    margin-inline-end: 4px;
    color: var(--heart, var(--rating-1));
    font-size: var(--font-size-activity-heart);
    vertical-align: top;
  }
}

.percent-sign {
  font-size: var(--font-size-activity-percent);
  font-weight: var(--font-weight-headings-light);
}

.text {
  padding: 2px 0 0 7px;
  font-size: var(--font-size-small);
  line-height: 1.2;
  text-transform: uppercase;
}

.users-wrapper {
  position: relative;
  margin-block-start: -1px;
  padding: var(--activity-users-padding);
  border: 1px solid var(--color-activity-border);
  background-color: var(--color-activity-bg);
}

.users {
  display: grid;
  grid-template-columns: repeat(var(--per-row), minmax(0, 1fr));
  gap: var(--activity-avatar-gap);
  margin: 0;
  padding: 0 0 var(--activity-avatar-gap);
  list-style: none;
}

a,
[role='img'] {
  display: block;

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 2px;
    border-radius: 50%;
  }
}

.user-avatar {
  --ring: var(--color-avatar-border);
  position: relative;
  display: block;
}

/* OG's `.corner-rating.block`: the corner square the round avatar sits on. */
.block {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  z-index: 1;
  inline-size: 50%;
  block-size: 50%;
  background-color: var(--ring);
}

img {
  position: relative;
  z-index: 5;
  display: block;
  inline-size: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: var(--activity-avatar-border) solid var(--ring);
  border-radius: 50%;
  background-color: var(--color-avatar-border);
}

.plus-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  aspect-ratio: 1;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: var(--color-plus-more-bg);
  color: var(--color-plus-more-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  line-height: 1;

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 2px;
  }
}

.more-number {
  font-size: var(--font-size-plus-more);
  font-weight: var(--font-weight-headings-heavy);
}

.line {
  display: block;
}

/* OG's `.tooltip-hr` between the name and the plays. */
.divider {
  display: block;
  margin-block: var(--space-tooltip-divider);
  border-block-end: 1px solid var(--color-tooltip-divider);
}

@media (prefers-reduced-motion: reduce) {
  .tab,
  .tab > * {
    transition: none;
  }
}
</style>
