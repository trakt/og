<script lang="ts">
import { tick } from 'svelte';
import { page } from '$app/state';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { login } from '$lib/auth/login';
import { changeRelationship } from '$lib/users/changeRelationship';
import { createRelationshipOverlay } from '$lib/users/createRelationshipOverlay.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Container from '$lib/components/container/Container.svelte';
import PanelHeading from '$lib/components/dashboard/PanelHeading.svelte';
import Icon from '$lib/icons/Icon.svelte';
import inbox from '$lib/icons/thin/inbox.svg?raw';
import check from '$lib/icons/trakt/check.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';
import block from '$lib/icons/trakt/block.svg?raw';
import blockThick from '$lib/icons/trakt/block-thick.svg?raw';
import type { toFollowRequest } from '$lib/dashboard/toFollowRequest';

const { requests }: { requests: readonly ReturnType<typeof toFollowRequest>[] } = $props();
const relationships = createRelationshipOverlay();
let section = $state<HTMLElement>();
const visible = $derived(
  requests.filter((request) =>
    !['approve', 'deny'].includes(relationships.state(request.slug, relation(request.id)).decision ?? '')
  ),
);
const relation = (id: number) => ({ follow: 'none' as const, followsYou: false, blocked: false, requestId: id });
$effect(() => {
  void requests;
  void page.data.user?.slug;
  relationships.clear();
});
async function decide(request: ReturnType<typeof toFollowRequest>, action: 'approve' | 'deny' | 'blockRequest') {
  if (!(await userManager().getUser())?.access_token) return login();
  const next = section?.querySelector<HTMLButtonElement>(`li[data-request="${request.id}"] + li button`);
  const fallback = section?.closest('main')?.querySelector<HTMLAnchorElement>('a[href*="/progress/"]');
  const saving = changeRelationship({
    slug: request.slug,
    isPrivate: false,
    relation: relation(request.id),
    action,
    overlay: relationships,
    request: (path, method) =>
      rawApiFetch({ path, fetch: authenticatedFetch({ manager: userManager() }), init: { method } }),
    notify: toast,
  });
  if (action === 'blockRequest') {
    await saving;
    return;
  }
  await tick();
  (next?.isConnected ? next : visible.length > 0 ? section : fallback)?.focus({ preventScroll: true });
  await saving;
}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if visible.length > 0}
  <section bind:this={section} tabindex="-1" class="inbox" aria-labelledby="inbox-heading">
  <Container>
    <PanelHeading id="inbox-heading" title="Inbox" icon={inbox} section />
    <div class="requests">
      <h3>Follow Requests</h3>
      <ul>
          {#each visible as request (request.id)}
            {@const decision = relationships.state(request.slug, relation(request.id)).decision}
            <li data-request={request.id}>
              <a class="avatar" href="/users/{request.slug}" tabindex="-1" aria-hidden="true"><img src={request.avatarUrl} alt="" width="45" height="45" /></a>
              <p>{request.requestedAt}<br /><a href="/users/{request.slug}">{request.name}</a> wants to follow you.</p>
              <div class="actions">
                {#each [{ action: 'approve', label: 'Approve', svg: check }, { action: 'deny', label: 'Deny', svg: deleteIcon }, { action: 'blockRequest', label: 'Block', svg: block }] as const as choice (choice.action)}
                  <Tooltip text={choice.label}>
                    {#snippet trigger(tip)}
                      <button class={choice.label.toLowerCase()} class:off={decision === 'block' && choice.action !== 'blockRequest'} type="button" aria-label="{choice.label} {request.name}'s request"
                        aria-pressed={choice.action === 'blockRequest' ? decision === 'block' : undefined}
                        aria-disabled={relationships.busy(request.slug) || decision !== null} onclick={() => decide(request, choice.action)} {...tip}><Icon svg={decision === 'block' && choice.action === 'blockRequest' ? blockThick : choice.svg} /></button>
                    {/snippet}
                  </Tooltip>
                {/each}
              </div>
            </li>
          {/each}
        </ul>
    </div>
  </Container>
</section>
{/if}

<style>
.inbox {
  display: flow-root;
  padding-block-end: var(--dashboard-inbox-bottom);
  background: var(--color-dashboard-inbox-bg);
  color: var(--color-text-inverse);
}
.requests {
  inline-size: calc(50% - var(--gutter) / 2);
}
h3 {
  margin: var(--dashboard-inbox-title-margin);
  color: inherit;
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  gap: var(--space-sm-inline);
  font-size: var(--font-size-dashboard-inbox-message);
  &:not(:first-child) {
    padding-block-start: var(--space-lg-block);
    margin-block-start: var(--space-lg-block);
    border-block-start: var(--dashboard-border-width) solid var(--color-dashboard-inbox-border);
  }
}
.avatar {
  flex-shrink: 0;
  img {
    display: block;
    inline-size: var(--dashboard-inbox-avatar);
    block-size: var(--dashboard-inbox-avatar);
    border-radius: 50%;
    object-fit: cover;
  }
}
p {
  flex: 1;
  margin: 0;
  padding-block-start: var(--space-sm-block);
}
a {
  color: inherit;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
}
.actions {
  display: flex;
  align-items: start;
  gap: var(--space-sm-inline);
  padding-inline: var(--space-sm-inline);
}
button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--font-size-dashboard-inbox-action);
  line-height: var(--dashboard-inbox-action-line);
  opacity: 1;
  cursor: pointer;
  &.off {
    visibility: hidden;
  }
  &[aria-disabled='true'] {
    cursor: default;
  }
  &:focus-visible {
    outline: var(--watch-focus) solid currentColor;
    outline-offset: var(--space-xs-inline);
  }
}
.approve {
  color: var(--brand-success);
}
.deny {
  color: var(--brand-primary);
}
.block {
  color: var(--gray-light);
  font-size: var(--font-size-dashboard-inbox-block);
}
@media (width < 992px) {
  .requests {
    inline-size: 100%;
  }
}
</style>
