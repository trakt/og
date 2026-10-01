<script lang="ts">
import { getContext } from 'svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import { changeRelationship } from '$lib/users/changeRelationship';
import { createRelationshipOverlay } from '$lib/users/createRelationshipOverlay.svelte';
import { relationshipRequest } from '$lib/users/relationshipRequest';
import type { ViewerRelation } from '$lib/users/ViewerRelation';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import deleteThick from '$lib/icons/trakt/delete-thick.svg?raw';
import blockThick from '$lib/icons/trakt/block-thick.svg?raw';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import block from '$lib/icons/trakt/block.svg?raw';
import check from '$lib/icons/trakt/check.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';

const { firstName, slug, isPrivate, relation }: {
  firstName: string;
  slug: string;
  isPrivate: boolean;
  relation: ViewerRelation;
} = $props();
const overlay = getContext<ReturnType<typeof createRelationshipOverlay>>('user-relationships') ??
  createRelationshipOverlay();
const decision = $derived(overlay.state(slug, relation).decision);
const busy = $derived(overlay.busy(slug));
const change = (action: 'approve' | 'deny' | 'blockRequest') =>
  changeRelationship({ slug, isPrivate, relation, action, overlay, request: relationshipRequest, notify: toast });
</script>

<div class="pending-follow">
  <span class="text">{firstName} wants to follow you</span>
  <span class="actions">
    <Tooltip text="Approve">
      {#snippet trigger(tooltip)}
        <button type="button" class:off={decision !== null && decision !== 'approve'} class="approve"
          aria-label="Approve {firstName}'s follow request" aria-pressed={decision === 'approve'}
          aria-disabled={busy || decision !== null} aria-busy={busy} onclick={() => change('approve')} {...tooltip}>
          <Icon svg={decision === 'approve' ? checkThick : check} />
        </button>
      {/snippet}
    </Tooltip>
    <Tooltip text="Deny">
      {#snippet trigger(tooltip)}
        <button type="button" class:off={decision !== null && decision !== 'deny'} class="deny"
          aria-label="Deny {firstName}'s follow request" aria-pressed={decision === 'deny'}
          aria-disabled={busy || decision !== null} aria-busy={busy} onclick={() => change('deny')} {...tooltip}>
          <Icon svg={decision === 'deny' ? deleteThick : deleteIcon} />
        </button>
      {/snippet}
    </Tooltip>
    <Tooltip text="Block">
      {#snippet trigger(tooltip)}
        <button type="button" class:off={decision !== null && decision !== 'block'} class="block"
          aria-label="Block {firstName}" aria-pressed={decision === 'block'}
          aria-disabled={busy || decision !== null} aria-busy={busy} onclick={() => change('blockRequest')} {...tooltip}>
          <Icon svg={decision === 'block' ? blockThick : block} />
        </button>
      {/snippet}
    </Tooltip>
  </span>
</div>

<style>
.pending-follow {
  display: inline-block;
  margin-inline-end: 10px;
  padding: 1px 10px 2px 12px;
  background-color: var(--color-profile-request-bg);
  vertical-align: top;
}

.text {
  display: inline-block;
  padding-block-start: 3px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
  vertical-align: middle;
}

.actions {
  display: inline-block;
  padding-inline-start: 15px;
  font-size: var(--font-size-request-icons);
  vertical-align: middle;
}

button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: inherit;
  line-height: var(--line-height-base);
  cursor: pointer;
  transition: opacity var(--transition-relationship-request);
  &.off {
    opacity: 0;
    visibility: hidden;
  }
  &[aria-disabled="true"] {
    cursor: default;
  }
}

.approve {
  margin-inline-end: 10px;
  color: var(--brand-success);
}

.deny {
  color: var(--brand-primary);
}

.block {
  margin-inline-start: 10px;
  color: var(--gray-light);
  font-size: var(--font-size-request-block);
  line-height: 28px;
  vertical-align: text-bottom;
}
@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
}
</style>
