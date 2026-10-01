<script lang="ts">
import { getContext } from 'svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import Icon from '$lib/icons/Icon.svelte';
import timer from '$lib/icons/solid/timer.svg?raw';
import blockThick from '$lib/icons/trakt/block-thick.svg?raw';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import deleteThick from '$lib/icons/trakt/delete-thick.svg?raw';
import { changeRelationship } from '$lib/users/changeRelationship';
import { createRelationshipOverlay } from '$lib/users/createRelationshipOverlay.svelte';
import { relationshipRequest } from '$lib/users/relationshipRequest';
import type { ViewerRelation } from '$lib/users/ViewerRelation';

interface Props {
  slug: string;
  isPrivate: boolean;
  relation: ViewerRelation;
  canFollow?: boolean;
  variant?: 'profile' | 'card';
}
const { slug, isPrivate, relation, canFollow = true, variant = 'profile' }: Props = $props();
const overlay = getContext<ReturnType<typeof createRelationshipOverlay>>('user-relationships') ??
  createRelationshipOverlay();
const entry = $derived(overlay.state(slug, relation));
const current = $derived(entry.relation);
const busy = $derived(overlay.busy(slug));
const removing = $derived(current.follow !== 'none');
const label = $derived(current.follow === 'none' ? 'Follow' : current.follow === 'pending' ? 'Pending' : 'Following');
const hover = $derived(current.follow === 'pending' ? 'Cancel' : 'Unfollow');
let followButton = $state<HTMLButtonElement>();
async function change(action: 'follow' | 'unfollow' | 'block' | 'unblock') {
  const saved = await changeRelationship({
    slug,
    isPrivate,
    relation,
    action,
    overlay,
    request: relationshipRequest,
    notify: toast,
  });
  if (saved && (action === 'block' || action === 'unblock')) followButton?.focus({ preventScroll: true });
}
</script>

{#if removing || canFollow}
  <button bind:this={followButton} type="button" class={['btn', variant, current.follow, { removing }]}
  aria-label="{removing ? hover : label} {slug}" aria-busy={busy} aria-disabled={busy}
  onclick={() => change(removing ? 'unfollow' : 'follow')}>
    {#if removing && (variant === 'card' || current.follow === 'following')}
      <span class="status-icon"><Icon svg={current.follow === 'pending' ? timer : checkThick} /></span>
      <span class="remove-icon"><Icon svg={deleteThick} /></span>
    {/if}
    <span class="normal-text">{label}</span>{#if removing}<span class="hover-text">{hover}</span>{/if}
  </button>
{/if}
{#if variant === 'card'}
  {#if current.followsYou}<span class="btn card follows-you"><Icon svg={checkThick} />Follows You</span>{/if}
{:else if !entry.hideBlock && (current.followsYou || current.blocked)}
  <button type="button" class="btn profile secondary removing" aria-busy={busy} aria-disabled={busy}
  aria-label="{current.blocked ? 'Unblock' : 'Block'} {slug}"
  onclick={() => change(current.blocked ? 'unblock' : 'block')}>
  <span class="status-icon"><Icon svg={current.blocked ? blockThick : checkThick} /></span>
  <span class="remove-icon"><Icon svg={deleteThick} /></span>
  <span class="normal-text">{current.blocked ? 'Blocked' : 'Follows You'}</span>
  <span class="hover-text">{current.blocked ? 'Unblock' : 'Block User'}</span>
</button>
{/if}

<style>
.btn {
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}
button {
  cursor: pointer;
}
button[aria-disabled="true"] {
  cursor: wait;
}
.profile {
  margin: var(--relationship-profile-margin);
  border-color: transparent;
  background-color: transparent;
  & :global(.icon) {
    margin: var(--relationship-profile-icon-margin);
  }
}
.card {
  min-block-size: 0;
  display: inline-block;
  margin: var(--user-card-btn-gap) var(--user-card-btn-gap) 0 0;
  padding: var(--user-card-btn-padding);
  border: 1px solid var(--btn-bg);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-small);
  line-height: var(--line-height-base);
  vertical-align: middle;
  & :global(.icon) {
    margin-inline-end: var(--user-card-btn-icon-gap);
  }
}
.none {
  --btn-bg: var(--brand-primary);
}
.following {
  --btn-bg: var(--brand-quaternary);
}
.pending {
  --btn-bg: var(--color-btn-pending);
}
.follows-you {
  --btn-bg: var(--color-btn-follows-you);
}
.none,
.following,
.pending,
.follows-you {
  background-color: var(--btn-bg);
}
.hover-text,
.remove-icon {
  display: none;
}
.removing:is(:hover, :focus-visible) {
  background-color: var(--color-relationship-remove-bg);
  border-color: var(--color-relationship-remove-border);
  & .normal-text,
  & .status-icon {
    display: none;
  }
  & .hover-text,
  & .remove-icon {
    display: inline;
  }
}
.card.removing:is(:hover, :focus-visible) {
  background-color: var(--color-relationship-card-remove-bg);
  border-color: var(--color-relationship-card-remove-border);
}
</style>
