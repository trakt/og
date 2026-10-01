<!--
  OG's list row: a fanned stack of the list's first five posters, then a header bar with
  the owner's avatar, the list name, the privacy and collaborator pills, the owner with their VIP label, the viewer's
  icons and the counts, then the description, rendered like a comment and clamped with a read-more shade. Hovering the
  stack opens up the poster under the pointer.
-->
<script lang="ts">
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import ListLikeButton from '$lib/components/lists/ListLikeButton.svelte';
import type { Snippet } from 'svelte';
import CommentText from '$lib/components/comments/CommentText.svelte';
import { parseComment } from '$lib/components/comments/text/parseComment';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import ReadMore from '$lib/components/readmore/ReadMore.svelte';
import ShareButton from '$lib/components/share/ShareButton.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import userXmark from '$lib/icons/light/user-xmark.svg?raw';
import barsProgress from '$lib/icons/thin/bars-progress.svg?raw';
import comment from '$lib/icons/trakt/comment.svg?raw';
import ManageConfirm from '$lib/components/comments/ManageConfirm.svelte';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';
import document from '$lib/icons/trakt/document.svg?raw';
import flag from '$lib/icons/trakt/flag-2.svg?raw';
import pencil from '$lib/icons/trakt/pencil.svg?raw';
import voteYes from '$lib/icons/trakt/vote-yes.svg?raw';
import type { VipBadge } from '$lib/users/VipBadge';
import type { ListRowActions } from './ListRowActions.ts';
import RankPill from './RankPill.svelte';

type Owner = { name: string; href: string; avatar?: string; vip?: VipBadge | null };

interface Props {
  href: string;
  name: string;
  owner: Owner;
  /** The list's first items, in list order. Only five show. The title is the poster's tooltip, where it's known. */
  posters: readonly { title?: string; image?: string }[];
  itemCount: number;
  /** Left out for the watchlist and favorites, which can't be liked. */
  likeCount?: number;
  likeTarget?: { readonly id: number; readonly ownerSlug?: string; readonly viewer: string | null };
  /** Left out when comments are off. */
  commentCount?: number;
  /** Grey pills before the owner: "Private", "Official List", "Following". */
  pills?: readonly string[];
  /** The blue "Link" pill after "Private", on a list shared by link. */
  shareLink?: boolean;
  /** Approved collaborators' names: the orange "N collaborators" pill, with the names in its tooltip. */
  collaborators?: readonly string[];
  /** Markdown, like a comment. */
  description?: string;
  /** Position on a ranked page, shown as a pill over the posters on hover. */
  rank?: number;
  /** The viewer's icons. Left out, the row shows only the counts. */
  actions?: ListRowActions;
  /** Reorder controls over the poster stack, including its editable rank. */
  reorderControls?: Snippet;
}

const {
  href,
  name,
  owner,
  posters,
  itemCount,
  likeCount,
  likeTarget,
  commentCount,
  pills = [],
  shareLink = false,
  collaborators = [],
  description,
  rank,
  actions,
  reorderControls,
}: Props = $props();

let reportOpen = $state(false);
const reportScope = $derived(`${likeTarget?.id}:${likeTarget?.viewer}`);
$effect(() => {
  void reportScope;
  reportOpen = false;
});
const shown = $derived(posters.slice(0, 5));
const blocks = $derived(parseComment(description?.trim() ?? ''));
const plural = (count: number, word: string) => `${word}${count === 1 ? '' : 's'}`;
</script>

<!-- Hrefs come in as props pointing at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet action(label: string, svg: string, kind: string, target: { onclick?: () => void })}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button
        type="button"
        class={['action', kind]}
        aria-label={label}
        aria-disabled={target.onclick ? undefined : 'true'}
        onclick={() => target.onclick?.()}
        {...tooltip}
      >
        <Icon {svg} />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

{#snippet count(label: string, svg: string, value: number, word: string)}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <span class="count-icon" {...tooltip}><Icon {svg} /></span>
    {/snippet}
  </Tooltip>{value.toLocaleString('en-US')}
  <span class="count-text">{plural(value, word)}</span>
{/snippet}

{#if likeTarget && actions?.report && !actions.report.onclick}<ReportDialog bind:open={reportOpen}
  target={{ type: 'list', id: likeTarget.id, ownerSlug: likeTarget.ownerSlug, title: name, href }} />{/if}

<article class="list-row">
  <div class="posters">
    {#if rank !== undefined && !reorderControls}
      <span class="rank"><RankPill {rank} /></span>
    {/if}
    <!-- The list name link is the one in the tab order; this is the same link for the mouse. -->
    <a class="poster-items" {href} tabindex="-1" aria-hidden="true">
      {#each shown as poster, i (i)}
        <Tooltip text={poster.title}>
          {#snippet trigger(tooltip)}
            <span class="poster-item" {...tooltip}>
              {#if poster.image}
                <img class="poster" src={poster.image} alt="" loading="lazy" decoding="async" />
              {:else}
                <span class="poster"></span>
              {/if}
            </span>
          {/snippet}
        </Tooltip>
      {/each}
    </a>
    {#if reorderControls}{@render reorderControls()}{/if}
  </div>
  <div class="info">
    <header class="above">
      <a class="avatar" href={owner.href} tabindex="-1" aria-hidden="true">
        {#if owner.avatar}<img src={owner.avatar} alt="" />{/if}
      </a>
      <div class="user-name">
        <a class="name-link" {href}><h3>{name}</h3></a>
        <p class="by">
          {#each pills as pill (pill)}<span class="pill">{pill}</span>{/each}
          {#if shareLink}
            <Tooltip text="Anyone with this link can view the list">
              {#snippet trigger(tooltip)}<span class="pill share-link" {...tooltip}>Link</span>{/snippet}
            </Tooltip>
          {/if}
          {#if collaborators.length > 0}
            <Tooltip text={collaborators.join('\n')}>
              {#snippet trigger(tooltip)}
                <span class="pill collaborators" {...tooltip}>
                  <span class="pill-title">{collaborators.length}</span>{plural(collaborators.length, 'collaborator')}
                  <span class="count-text">: {collaborators.join(', ')}</span>
                </span>
              {/snippet}
            </Tooltip>
          {/if}
          by <a class="username" href={owner.href}>{owner.name}</a>{#if owner.vip}<VipLabel badge={owner.vip} pill />{/if}
        </p>
      </div>
      <div class="interactions">
        {#if actions}
          {#if actions.report}{@render action('Report List', flag, 'report', actions.report.onclick ? actions.report : { onclick: likeTarget?.viewer ? () => { reportOpen = true; } : undefined })}{/if}
          {#if actions.edit}{@render action('Edit', pencil, 'edit', actions.edit)}{/if}
          {#if actions.delete?.onclick}<span class="delete" style:--confirm-icon-size="var(--font-size-list-row-action)"><ManageConfirm name="delete" svg={deleteIcon} label="Delete" yes="Yes, delete it!" warning={actions.delete.warning} disabled={actions.delete.busy} onconfirm={actions.delete.onclick}>Delete this list?</ManageConfirm></span>{:else if actions.delete}{@render action('Delete', deleteIcon, 'delete', actions.delete)}{/if}
          {#if actions.leave}{@render action('Stop collaborating on this list', userXmark, 'leave', actions.leave)}{/if}
          {#if actions.progress}{@render action('View watched progress', barsProgress, 'progress', actions.progress)}{/if}
          {#if actions.progressHref}
            <Tooltip text="View watched progress">
              {#snippet trigger(tooltip)}
                <a class="action progress" href={actions.progressHref} aria-label="View watched progress" {...tooltip}>
                  <Icon svg={barsProgress} />
                </a>
              {/snippet}
            </Tooltip>
          {/if}
          {#if actions.shareUrl}<span class="share"><ShareButton url={actions.shareUrl} title={name} /></span>{/if}
        {/if}
        <span class="count">{@render count('Items', document, itemCount, 'item')}</span>
        {#if likeCount !== undefined}
          <span class="count">
            {#if likeTarget}<ListLikeButton {...likeTarget} count={likeCount} words />
            {:else}{@render count('Likes', voteYes, likeCount, 'like')}{/if}
          </span>
        {/if}
        {#if commentCount !== undefined}
          <a class="count" href="{href}/comments">{@render count('Comments', comment, commentCount, 'comment')}</a>
        {/if}
      </div>
    </header>
    {#if blocks.length > 0}
      <div class="overview"><ReadMore><CommentText {blocks} /></ReadMore></div>
    {/if}
  </div>
</article>

<style>
.list-row {
  display: flex;
  flex-wrap: wrap;
  row-gap: var(--gutter);
  padding-block-start: var(--gutter);
}

.posters {
  position: relative;
  flex: none;
  inline-size: 250px;

  &:hover .rank {
    opacity: 1;
  }
}

/* OG only showed the rank while the pointer is over the posters. */
.rank {
  opacity: 0;
  transition: opacity var(--transition-card);
}

/* Right-aligned stack: the first poster is 120px wide, the rest show a 32px sliver of their right edge. */
.poster-items {
  display: flex;
  justify-content: flex-end;
  min-block-size: 60px;
  overflow: hidden;

  &:hover .poster-item {
    inline-size: 32px;
  }
}

.poster-item {
  position: relative;
  flex: none;
  inline-size: 32px;
  block-size: 180px;
  overflow: hidden;
  box-shadow: var(--shadow-list-poster);
  transition: inline-size var(--transition-card);

  &:first-child,
  .poster-items &:hover {
    inline-size: 120px;
  }
}

.poster {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  display: block;
  inline-size: 120px;
  aspect-ratio: var(--ratio-poster);
  background-color: var(--color-card-bg);
  object-fit: cover;
}

span.poster {
  background-image: var(--image-placeholder-poster);
  background-size: cover;
}

/* Narrower than the posters plus 300px, the info drops under the posters. */
.info {
  flex: 1 1 300px;
  min-inline-size: 0;
  margin-inline-start: var(--gutter);
}

.above {
  display: flex;
  flex-wrap: wrap;
  margin-inline-start: calc(var(--gutter) * -1);
  padding: 10px var(--gutter);
  background-color: var(--color-list-row-header);
  /* Its own text color, so the bar reads on a dark frame too (the search Lists tab). */
  color: var(--color-text);
}

.avatar {
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  border-radius: 50%;
  background-color: var(--color-avatar-border);

  & img {
    display: block;
    inline-size: 100%;
    border: 2px solid var(--color-avatar-border);
    border-radius: 50%;
    background-color: var(--color-avatar-border);
  }
}

.user-name {
  flex: 1;
  min-inline-size: 0;
  padding-inline-start: 12px;
}

.name-link {
  color: var(--color-text);

  &:is(:hover, :focus-visible) {
    color: var(--color-link);
  }
}

h3 {
  margin: 2px 0 0;
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-h4);
}

.by {
  margin: 2px 0 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
}

.username {
  color: var(--color-text);
}

.pill {
  margin-inline-end: 5px;
  padding: 1px 4px;
  border-radius: 2px;
  background-color: var(--color-pill);
  color: var(--color-card-text);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-card-tag);
  text-transform: uppercase;
}

.share-link {
  background-color: var(--color-list-pill-link);
}

.collaborators {
  background-color: var(--color-list-pill-collaborators);
}

/* The count at the pill's start, a shade darker. */
.pill-title {
  display: inline-block;
  margin: 0 4px 0 -4px;
  padding: 2px 4px 1px;
  border-radius: 2px 0 0 2px;
  background-color: var(--color-list-pill-collaborators-count);
}

.interactions {
  display: flex;
  align-items: center;
  gap: var(--list-row-action-gap);
  margin-block-start: 12px;
  align-self: flex-start;
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  white-space: nowrap;
}

.action {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-list-row-action);
  line-height: 1;
  transition: opacity 0.5s;

  &[aria-disabled='true'] {
    cursor: default;
  }
}

/* OG faded the flag in while the pointer was over the row. */
.report {
  opacity: 0;

  .info:hover &,
  &:focus-visible {
    opacity: 1;
  }
}

.edit {
  color: var(--color-list-edit);
}

.delete,
.leave {
  color: var(--color-list-delete);
}

.leave {
  font-size: var(--font-size-list-row-leave);
}

.progress {
  color: var(--color-list-progress);

  &:is(:hover, :focus-visible) {
    color: var(--color-list-progress);
  }
}

.share,
.count {
  color: var(--brand-secondary);
}

.count-icon :global(.icon) {
  margin-inline-end: 5px;
  font-size: var(--font-size-rating);
  vertical-align: top;
}

a.count:is(:hover, :focus-visible) {
  color: var(--brand-secondary);
}

/* OG showed only the numbers on desktop; the words stay for screen readers. */
.count-text {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.overview {
  --read-more-shade: var(--color-surface);
  margin-block: var(--gutter);
}

@media (prefers-reduced-motion: reduce) {
  .rank,
  .poster-item,
  .action {
    transition: none;
  }
}
</style>
