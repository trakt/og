<!--
  OG's comment card, which every comment list renders: the author row with the rating badge, labels and dates,
  the manage icons, the text with read more and spoiler blur, and the under-comment row with the watched state,
  reactions and replies. "N replies" opens the replies inline under the card.

  Add Reply opens a reply box under the row, and a posted reply goes to the top of the thread. The pencil swaps
  the text for an edit form, and the × asks before deleting. The flag opens the report dialog, and the block icon asks before blocking the member's comments. A blocked member's card collapses to
  its faded header until clicked, and their replies are dropped from the inline thread. Reactions share the viewer's
  choices and totals.
-->
<script lang="ts">
import { page } from '$app/state';
import { fade } from 'svelte/transition';
import { untrack } from 'svelte';
import ReactionControl from '$lib/components/comments/ReactionControl.svelte';
import { commentReactions } from '$lib/components/comments/commentReactions';
import Icon from '$lib/icons/Icon.svelte';
import arrowsRotate from '$lib/icons/solid/arrows-rotate.svg?raw';
import commentIcon from '$lib/icons/solid/comment.svg?raw';
import commentPlus from '$lib/icons/solid/comment-plus.svg?raw';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import flag from '$lib/icons/trakt/flag-2.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';
import pencil from '$lib/icons/trakt/pencil.svg?raw';
import userBlock from '$lib/icons/trakt/user-block.svg?raw';
import type { CommentResponse } from '@trakt/api';
import { overlay } from '../../overlay/overlay.ts';
import type { FormatDateOptions } from '../../utils/formatDate.ts';
import VideoPopup from '../dialog/VideoPopup.svelte';
import ReadMore from '../readmore/ReadMore.svelte';
import ShareButton from '../share/ShareButton.svelte';
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import { toast } from '../toast/toast.svelte.ts';
import Tooltip from '../tooltip/Tooltip.svelte';
import VipLabel from '../labels/VipLabel.svelte';
import { authorOf, PLACEHOLDER_AVATAR } from './authorOf.ts';
import { blockedMembers } from './blockedMembers.svelte.ts';
import { browserCommentsClient } from './browserCommentsClient.ts';
import CommentAvatar from './CommentAvatar.svelte';
import CommentCard from './CommentCard.svelte';
import CommentEditor from './CommentEditor.svelte';
import { commentDates } from './commentDates.ts';
import { commentSettings } from './commentSettings.ts';
import type { CommentItem } from './CommentItem.ts';
import type { CommentsClient } from './commentsClient.ts';
import CommentText from './CommentText.svelte';
import { focusComment } from './focusComment.ts';
import { commentType } from './commentType.ts';
import type { CommentViewer } from './CommentViewer.ts';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import ManageConfirm from '$lib/components/comments/ManageConfirm.svelte';
import { manageLinks } from './manageLinks.ts';
import ReactionSummary from './ReactionSummary.svelte';
import { reactionSummary } from './reactionSummary.ts';
import { spoilerRevealed } from './spoilerRevealed.ts';
import { parseComment } from './text/parseComment.ts';
import { watchedIndicator } from './watchedIndicator.ts';
import { withoutBlocked } from './withoutBlocked.ts';

interface Props {
  comment: CommentResponse;
  /** What it's about. Left out, there's no watched state, no spoiler reveal and no share title. */
  item?: CommentItem;
  viewer?: CommentViewer;
  /** The comment a reply answers, shown collapsed above the text where replies appear outside their thread. */
  parent?: CommentResponse;
  /** OG's `.wider`: the reply count spells out "replies" on desktop. */
  wide?: boolean;
  /** OG's featured style for reviews in comment lists. */
  featured?: boolean;
  /** The item and season or episode title above the text, where a list mixes items. */
  titles?: { readonly item: string; readonly episode?: string };
  /** The under-comment row is left out, like replies next to a poster. */
  hideInteractions?: boolean;
  /** Where "N replies" points on the comment's own page. Left out, it opens the replies inline. */
  repliesAnchor?: string;
  /** The member's date order, clock and time zone. The time zone keeps the server and browser dates the same. */
  dateOptions?: Pick<FormatDateOptions, 'order' | 'hour24' | 'timeZone'>;
  client?: CommentsClient;
  /** Inline under the comment it replies to. */
  nested?: boolean;
  /** The replied-to author, for the OP pill. */
  opSlug?: string;
  /** Replies under a spoiler comment are blurred too. */
  inheritSpoiler?: boolean;
  /** Collapsed inside a reply as its parent, until clicked. */
  asParent?: boolean;
  /** The comment on its own page (OG's `#read`): no box, the author row on the page's band, the text flush. */
  read?: boolean;
  /**
   * Discover's Recent Comments (OG's `#recent-comments .comment-outer-wrapper`): no box over the column's veil, the
   * text in full, and the author row pinned to the bottom of the nearest positioned ancestor.
   */
  veiled?: boolean;
  /** Takes a posted reply where the page lists the thread itself. Left out, it goes into the card's inline thread. */
  onreply?: (reply: CommentResponse) => void;
  /** After the comment is deleted. */
  ondelete?: () => void;
}

const {
  comment: loaded,
  item,
  viewer = null,
  parent,
  wide = false,
  featured = false,
  titles,
  hideInteractions = false,
  repliesAnchor,
  dateOptions = { timeZone: 'UTC' },
  client,
  nested = false,
  opSlug,
  inheritSpoiler = false,
  asParent = false,
  read = false,
  veiled = false,
  onreply,
  ondelete,
}: Props = $props();

// Edits, and a reply's count going up, land here.
let comment = $derived(loaded);
// The root layout's `/users/settings`: whether the viewer may comment, and their avatar for the reply box.
const settings: ViewerSettings | null = $derived(page.data.settings ?? null);
// The comment spoiler setting and the blocked members.
const prefs = $derived(commentSettings(settings));
const member = $derived(
  viewer && { ...viewer, commentingBanned: viewer.commentingBanned ?? settings?.permissions.commenting === false },
);

const author = $derived(authorOf(comment.user));
const type = $derived(commentType(comment, item));
const dates = $derived(commentDates({ createdAt: comment.created_at, updatedAt: comment.updated_at }, dateOptions));
const blocks = $derived(parseComment(comment.comment));
const manage = $derived(manageLinks({ comment, viewer: member }));
const isReply = $derived(comment.parent_id > 0);
const isOp = $derived(opSlug !== undefined && author.slug === opSlug);
const rating = $derived(comment.user_stats.rating ?? comment.user_rating);
const watched = $derived(
  viewer && author.slug && item ? watchedIndicator({ stats: comment.user_stats, slug: author.slug, item }) : undefined,
);
const permalink = $derived(`/comments/${comment.id}`);
const canReply = $derived(member !== null && !member.commentingBanned && author.href !== undefined);
// Replies go to the top-level comment.
const threadId = $derived(isReply ? comment.parent_id : comment.id);

const viewerState = $derived.by(() => {
  if (!item || item.type === 'list') return {};
  if (item.type === 'season') return overlay.state('season', item.id, { show: item.show, number: item.number });
  if (item.type === 'episode') return overlay.state('episode', item.id, { show: item.show, number: item.season });
  return overlay.state(item.type, item.id);
});
let clicked = $state(false);
const blurred = $derived(
  (comment.spoiler || inheritSpoiler || prefs.hideSpoilers) && !clicked && !spoilerRevealed(item, viewerState),
);

// Blocked before the page loaded, or from a card on it .
const blocked = $derived(prefs.blocked.has(comment.user.ids.trakt) || blockedMembers.has(comment.user.ids.trakt));
let blockedShown = $state(false);
const showBlocked = () => {
  blockedShown = true;
  card?.setAttribute('tabindex', '-1');
  card?.focus({ preventScroll: true });
};

let parentOpen = $state(false);
let video = $state<string>();
const reactions = $derived(commentReactions.state(comment.id));
const summary = $derived(reactionSummary(reactions.summary));
let inView = $state(false);
$effect(() => {
  // A viewer switch clears pending patches, so visible cards load fresh public totals.
  const session = commentReactions.session;
  if (!inView || asParent) return;
  untrack(() => commentReactions.loadSummary(comment.id, comment.likes, (id) => api().reactionSummary(id), session));
});

let card = $state<HTMLElement>();
let repliesOpen = $state(false);
let replies = $state<readonly CommentResponse[]>();
// Posted from this card or its thread, newest first, above the loaded ones.
let posted = $state<readonly CommentResponse[]>([]);
const thread = $derived([
  ...posted,
  ...withoutBlocked(replies ?? [], prefs.blocked).filter(({ id }) => !posted.some((reply) => reply.id === id)),
]);
const repliesId = $props.id();

let replying = $state(false);
let editing = $state(false);
let deleted = $state(false);
let reporting = $state(false);

const api = () => client ?? browserCommentsClient();

const revealOnKey = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  clicked = true;
};

// A reaction also counts as a like, so a comment without likes has no reactions and needs no request.
const loadSummary = (element: HTMLElement) => {
  if (asParent) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    inView = true;
  }, { rootMargin: '200px' });
  observer.observe(element);
  return () => observer.disconnect();
};

const loadReplies = async () => {
  if (replies) return;
  replies = await api().replies(comment.id).catch(() => {
    toast.error('Doh! We ran into some sort of error.');
    repliesOpen = false;
    return undefined;
  });
};

const toggleReplies = (event: MouseEvent) => {
  if (repliesAnchor) return;
  event.preventDefault();
  if (comment.replies <= 0) return;

  repliesOpen = !repliesOpen;
  if (!repliesOpen) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  void loadReplies();
};

// A reply posted here or in the thread: on top of the thread, which opens (`create.js.coffee:2-8`).
const addReply = (reply: CommentResponse) => {
  comment = { ...comment, replies: comment.replies + 1 };
  posted = [reply, ...posted];
  repliesOpen = true;
  void loadReplies();
};

// The create response leaves out images unless asked, and the member is the viewer.
const withAvatar = (reply: CommentResponse): CommentResponse =>
  reply.user.images || !settings ? reply : { ...reply, user: { ...reply.user, images: settings.user.images } };

const replied = (reply: CommentResponse | null) => {
  replying = false;
  if (!reply) return;
  (onreply ?? addReply)(withAvatar(reply));
  void focusComment(reply.id);
};

// The saved text and flag; the member, their stats and the reply count stay as loaded.
const edited = (saved: CommentResponse | null, text: string, spoiler: boolean) => {
  editing = false;
  comment = saved
    ? { ...comment, comment: saved.comment, spoiler: saved.spoiler, review: saved.review, updated_at: saved.updated_at }
    : { ...comment, comment: text, spoiler };
  void focusComment(comment.id);
};

// OG fades the card out as the request starts (`comments.js:263-267`) and doesn't say when it fails; og brings it back
// with a toast. Focus moves on to the next card.
const remove = async () => {
  const cards = [...document.querySelectorAll<HTMLElement>('article.comment-wrapper')];
  const next = cards[cards.findIndex((element) => element === card) + 1];
  deleted = true;
  next?.setAttribute('tabindex', '-1');
  next?.focus({ preventScroll: true });
  const result = await api().remove(comment.id);
  if (!result.ok) {
    deleted = false;
    toast.error(result.message);
    return;
  }
  ondelete?.();
};

// Then every card by the member on the page collapses (`commentBlockUsers`).
const block = async () => {
  if (!author.slug) return;
  const result = await api().block(author.slug);
  if (!result.ok) {
    toast.error(result.message);
    return;
  }
  toast.success(`You blocked all comments by ${author.name}.`);
  blockedMembers.add(comment.user.ids.trakt);
};

const vanish = (node: Element) =>
  fade(node, { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000 });
</script>

{#snippet manageIcon(name: string, svg: string, label: string, onclick: () => void, expanded?: boolean)}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button type="button" class="manage-icon {name}" aria-label={label} aria-expanded={expanded} {onclick}
        {...tooltip}>
        <Icon {svg} />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<!-- Profile, history and comment hrefs point at og routes that resolve() only takes once they exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if !deleted}
<article
  out:vanish
  bind:this={card}
  id="comment-{comment.id}"
  class={[
    'comment-wrapper',
    {
      wide,
      featured,
      nested,
      read,
      veiled,
      reply: isReply,
      'with-replies': repliesOpen,
      'as-parent': asParent,
      collapsed: asParent && !parentOpen,
      blocked,
      enabled: blocked && blockedShown,
    },
  ]}
  aria-label="{type} by {author.name}"
  {@attach loadSummary}
>
  <header class="above-comment">
    {#if blocked && !blockedShown}
      <Tooltip text="Display blocked comment">
        {#snippet trigger(tooltip)}
          <button
            type="button"
            class="display-overlay"
            aria-label="Display blocked comment"
            aria-expanded="false"
            onclick={showBlocked}
            {...tooltip}
          ></button>
        {/snippet}
      </Tooltip>
    {:else if asParent && !parentOpen}
      <Tooltip text="Display parent comment">
        {#snippet trigger(tooltip)}
          <button
            type="button"
            class="display-overlay"
            aria-label="Display parent comment"
            aria-expanded="false"
            onclick={() => (parentOpen = true)}
            {...tooltip}
          ></button>
        {/snippet}
      </Tooltip>
    {/if}
    {#if author.href}
      <a class="avatar" href={author.href} tabindex="-1" aria-hidden="true">
        <CommentAvatar src={author.avatar} {rating} />
      </a>
    {:else}
      <span class="avatar"><CommentAvatar src={author.avatar} {rating} /></span>
    {/if}

    <div class="user-name">
      <p class="byline">
        {#if isOp}<span class="pill op">OP</span>{/if}
        <span class="type">{type}</span> by
        {#if author.href}
          <a class="username" href={author.href}>{author.name}</a>
          {#if author.badge}<VipLabel badge={author.badge} pill />{/if}
        {:else}
          <strong>{author.name}</strong>
        {/if}
      </p>
      <p class="labels">
        {#if blocked}<span class="pill blocked">Blocked</span>{/if}
        {#if asParent}<span class="pill parent">Parent</span>{/if}
        {#if comment.spoiler}<span class="pill spoiler">Spoilers</span>{/if}
        <a class="date" href={permalink}><time datetime={comment.created_at}>{dates.posted}</time></a>
        {#if dates.updated}
          <span class="updated-at">&mdash; updated <time datetime={comment.updated_at}>{dates.updated}</time></span>
        {/if}
      </p>
    </div>

    <div class="interactions manage">
      {#if manage.block && author.slug && !blocked}
        <ManageConfirm name="block" svg={userBlock} label="Block Member" yes="Yes, block them!" onconfirm={block}>
          Block all comments from <b>{author.name}</b>?
        </ManageConfirm>
      {/if}
      {#if manage.report}
        {@render manageIcon('report', flag, 'Report Comment', () => (reporting = true), reporting)}
      {/if}
      {#if manage.edit && !asParent}{@render manageIcon('edit', pencil, 'Edit', () => (editing = !editing), editing)}{/if}
      {#if manage.delete && !asParent}
        <ManageConfirm name="delete" svg={deleteIcon} label="Delete" yes="Yes, delete it!" onconfirm={remove}>
          Delete your comment?
        </ManageConfirm>
      {/if}
      <ShareButton url={new URL(permalink, page.url.origin).href} title={item?.title} />
    </div>
  </header>

  <div class="comment">
    {#if parent}
      <blockquote class="parent-inline">
        <CommentCard comment={parent} {item} {viewer} {dateOptions} {client} wide asParent />
      </blockquote>
    {/if}
    {#if titles}
      <p class="item-title">{titles.item}</p>
      {#if titles.episode}<p class="episode-title">{titles.episode}</p>{/if}
    {/if}
    {#if editing}
      <CommentEditor
        text={comment.comment}
        label="Edit your {isReply ? 'reply' : 'comment'}"
        placeholder={isReply ? 'Write a reply...' : 'What do you think?'}
        spoiler={isReply ? undefined : comment.spoiler}
        save={(text, spoiler) => api().edit(comment.id, { comment: text, spoiler })}
        onsaved={edited}
      />
    {:else if blurred}
      <Tooltip text="Click to reveal spoilers">
        {#snippet trigger(tooltip)}
          <div
            class="spoiler"
            role="button"
            tabindex="0"
            aria-label="Spoilers, click to reveal"
            onclick={() => (clicked = true)}
            onkeydown={revealOnKey}
            {...tooltip}
          >
            <div class="blur" aria-hidden="true" inert>
              <ReadMore><CommentText {blocks} /></ReadMore>
            </div>
          </div>
        {/snippet}
      </Tooltip>
    {:else}
      <ReadMore><CommentText {blocks} onvideo={(id) => (video = id)} /></ReadMore>
    {/if}
  </div>

  {#if !hideInteractions}
    <footer class="under-comment">
      <div class="interactions">
        {#if watched}
          <Tooltip text={watched.title}>
            {#snippet trigger(tooltip)}
              <a class="watched-at" href={watched.href} target="_blank" {...tooltip}>
                <Icon svg={checkThick} />
                <span class="count-number">{watched.count}</span>
                {watched.label}
              </a>
            {/snippet}
          </Tooltip>
        {/if}
        {#if viewer}
          <ReactionControl
            value={reactions.reaction}
            busy={reactions.busy}
            onopen={() => commentReactions.ready()}
            onselect={(type) => commentReactions.change({
              id: comment.id, type, likes: comment.likes, read: (id, fresh) => api().reactionSummary(id, fresh),
            })}
          />
        {/if}
        {#if summary}<ReactionSummary {summary} />{/if}
        {#if !isReply}
          <Tooltip text={comment.replies > 0 ? 'View Replies' : undefined} placement="bottom">
            {#snippet trigger(tooltip)}
              <a
                class="alt comment-count"
                href={repliesAnchor ?? permalink}
                aria-expanded={repliesAnchor || comment.replies === 0 ? undefined : repliesOpen}
                aria-controls={repliesAnchor ? undefined : repliesId}
                onclick={toggleReplies}
                {...tooltip}
              >
                <Icon svg={commentIcon} />
                <span class="count-number">{comment.replies.toLocaleString('en-US')}</span>
                <span class="count-text">{comment.replies === 1 ? 'reply' : 'replies'}</span>
              </a>
            {/snippet}
          </Tooltip>
        {/if}
        {#if canReply}
          <button type="button" class="alt add-reply" aria-expanded={replying} onclick={() => (replying = !replying)}>
            <Icon svg={commentPlus} />
            <span class="add-text">Add Reply</span>
          </button>
        {/if}
      </div>
      {#if replying}
        <CommentEditor
          text="@{author.slug}  "
          label="Your reply"
          placeholder="Write a reply..."
          avatar={settings?.user.images.avatar.full ?? PLACEHOLDER_AVATAR}
          save={(text) => api().reply(threadId, text)}
          onsaved={replied}
        />
      {/if}
    </footer>
  {/if}

  {#if repliesOpen}
    <div class="replies-wrapper" id={repliesId}>
      {#each thread as reply (reply.id)}
          <CommentCard
            comment={reply}
            {item}
            {viewer}
            {dateOptions}
            {client}
            nested
            opSlug={author.slug}
            inheritSpoiler={comment.spoiler || inheritSpoiler}
            onreply={addReply}
          />
      {/each}
      {#if !replies}
        <p class="loading" role="status"><Icon svg={arrowsRotate} /> <span class="text">loading replies</span></p>
      {/if}
    </div>
  {/if}
</article>
{/if}

{#if video}
  <VideoPopup bind:url={video} />
{/if}

{#if reporting}
  <ReportDialog bind:open={reporting} target={{ type: 'comment', id: comment.id, title: '', href: permalink }} />
{/if}

<style>
.comment-wrapper {
  --read-more-shade: var(--color-comment-bg);
  position: relative;
  border-radius: 2px;
  background-color: var(--color-comment-bg);
  scroll-margin-block-start: calc(var(--header-height) + var(--gutter));
  transition: all 0.5s;
  outline: 1px solid transparent;
}

.featured {
  --read-more-shade: var(--color-comment-featured-bg);
  --comment-reply-border: var(--color-comment-reply-border-featured);
  background-color: var(--color-comment-featured-bg);

  & > .above-comment {
    background-color: var(--color-comment-featured-header-bg);
  }
}

.above-comment {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: var(--comment-padding) var(--comment-padding) var(--space-lg-block);
  background-color: var(--color-comment-header-bg);
}

.avatar {
  flex: none;
  margin: -8px 0 5px -8px;
}

.user-name {
  flex: 1;
  min-inline-size: 0;
  padding-inline-start: var(--space-base-inline);
  margin-block-start: -4px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-comment-meta);
  line-height: var(--line-height-headings);

  & p {
    margin: 0;
  }
}

.username {
  font-weight: var(--font-weight-headings);
}

.labels {
  padding-block-start: 4px;
}

.pill {
  margin-inline-end: 5px;
  padding: 1px 4px;
  border-radius: 2px;
  background-color: var(--color-pill);
  color: var(--color-text-inverse);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-pill);
  text-transform: uppercase;
}

.op {
  background-color: var(--color-comment-pill-op);
}

.pill.parent {
  background-color: var(--color-comment-pill-parent);
}

.date {
  color: var(--color-comment-date);
  font-weight: var(--font-weight-headings);
}

.updated-at {
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: var(--font-size-small);
  font-style: italic;
  white-space: nowrap;
}

/* The icons on the right of the author row, and the links under the text. Flex, because OG's Slim put no whitespace
   between them. */
.interactions {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  margin-block-start: 3px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-comment-meta);
  line-height: var(--line-height-base);
  text-transform: uppercase;

  & :is(a, button) {
    min-block-size: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-comment-action);
    font: inherit;
    text-transform: inherit;
    text-decoration: none;

    &:not(:first-child) {
      margin-inline-start: 15px;
    }
  }

  & :global(.icon) {
    margin-inline-end: 5px;
  }
}

.manage {
  margin-inline-start: auto;
  padding-inline-start: var(--space-sm-inline);

  & .manage-icon {
    font-size: var(--font-size-comment-icon);
    line-height: 1;

    & :global(.icon) {
      margin-inline-end: 0;
    }
  }

  & .edit {
    color: var(--color-comment-edit);
  }

  & > :global(:is(.block, .share)) {
    color: var(--color-comment-action);
  }

  & > :global(.delete) {
    color: var(--color-comment-delete);
  }

  & > :global(:is(.block, .delete, .share):not(:first-child)) {
    margin-inline-start: 15px;
  }
}

/* Block and report only show on the hovered card, or when the keyboard gets there. Touch screens always show them. */
.manage > :is(:global(.block), .report) {
  opacity: 0;
  transition: opacity 0.5s;

  @media (hover: none) {
    opacity: 1;
  }
}

.comment-wrapper:is(:hover, :focus-within) > .above-comment > .manage > :is(:global(.block), .report) {
  opacity: 1;
}

.comment {
  padding: var(--comment-padding);
  overflow-wrap: break-word;
}

.item-title,
.episode-title {
  margin: 0 0 var(--space-lg-block);
  border-block-end: 1px solid var(--color-comment-rule);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  font-size: 120%;
}

.episode-title {
  font-size: 110%;
}

.spoiler {
  cursor: pointer;
}

.blur {
  filter: var(--blur-spoiler);
  pointer-events: none;
}

.under-comment {
  padding: 0 var(--comment-padding) var(--comment-padding);
}

.interactions .watched-at {
  color: var(--color-comment-watched);

  & :global(.icon) {
    font-size: var(--font-size-comment-meta);
  }

  &:hover {
    text-decoration: underline;
  }
}

.interactions > :global(.reaction-trigger:not(:first-child)) {
  margin-inline-start: var(--reaction-link-gap);
}

/* OG: `.reaction + .reaction-types-wrapper` and `.watched-at ~ .reaction-types-wrapper`. */
.interactions > :global(.reaction-types) {
  margin-inline-start: var(--space-sm-inline);
}

.add-reply:hover {
  text-decoration: underline;
}

/* "3" on narrow cards, "3 replies" on wide ones at desktop width. Screen readers always get the word. */
.count-text {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (min-width: 992px) {
  .wide > .under-comment .count-text {
    position: static;
    inline-size: auto;
    block-size: auto;
    clip-path: none;
  }
}

@media (max-width: 767px) {
  .add-text {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}

/* The comment on its own page:
   the author row sits on the page's band, and the text starts at the band's offset. */
.read {
  --read-more-shade: var(--color-surface);
  --comment-quote-bg: var(--color-comment-page-band);
  --comment-pre-bg: var(--color-comment-page-band);
  background-color: transparent;

  & > .above-comment {
    min-block-size: var(--comment-page-band);
    padding-inline: var(--comment-page-inset) 0;
    background-color: var(--color-comment-page-band);
  }

  & > .comment {
    padding: calc(var(--comment-page-offset) - var(--comment-page-band)) 0 var(--comment-padding);
  }

  & > .under-comment {
    padding-inline: 0;
  }
}

/* Discover's Recent Comments.
   OG swapped the comment in after read more had run, so its text never collapsed. */
.veiled {
  --comment-collapsed-height: none;
  --comment-quote-bg: var(--color-recent-comments-quote-bg);
  --comment-pre-bg: var(--color-recent-comments-quote-bg);
  position: static;
  background-color: transparent;

  & > .above-comment {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    background-color: var(--color-recent-comments-author-bg);
  }

  & > .comment {
    padding: var(--recent-comments-comment-padding);

    @media (width < 768px) {
      padding: var(--recent-comments-comment-padding-phone);
    }
  }
}

/* The parent comment of a reply shown out of its thread: faded to its header until clicked. */
.parent-inline {
  margin: 0 0 var(--gutter);
  padding: 0;
  border-inline-start: 5px solid var(--color-comment-quote-border);
  background-color: var(--color-comment-parent-bg);
}

.as-parent {
  --comment-quote-bg: var(--color-comment-parent-quote-bg);
  --read-more-shade: var(--color-comment-parent-bg);
  background-color: transparent;

  & > .above-comment {
    background-color: var(--color-comment-parent-header-bg);
  }
}

.as-parent.collapsed {
  opacity: 0.4;

  & > .comment,
  & > .under-comment {
    display: none;
  }

  & .manage {
    opacity: 0;
  }
}

.display-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: row-resize;
}

/* A blocked member's card: its header faded, until clicked. */
.pill.blocked {
  background-color: var(--color-comment-pill-blocked);
}

.comment-wrapper.blocked {
  transition: all 0.5s, opacity 0.75s;

  &:not(.enabled) {
    opacity: 0.3;

    & > :is(.comment, .under-comment, .replies-wrapper) {
      display: none;
    }

    & > .above-comment > .manage {
      opacity: 0;
    }

    &:hover {
      box-shadow: var(--shadow-comment-blocked);
    }
  }

  &.enabled {
    box-shadow: var(--shadow-comment-blocked-shown);
  }
}

/* A card with its replies open. */
.with-replies {
  outline-color: var(--color-comment-open-outline);
  box-shadow: var(--shadow-comment-open);
}

.replies-wrapper {
  & .loading {
    margin: 0;
    padding: var(--comment-padding);
    font-family: var(--font-headings);
    font-weight: var(--font-weight-headings);

    & .text {
      font-size: var(--font-size-small);
    }

    & :global(.icon) {
      margin-inline-end: 5px;
    }
  }
}

@media (prefers-reduced-motion: no-preference) {
  .loading :global(.icon) {
    animation: spin 2s linear infinite;
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.nested {
  margin-block-start: 0;
  background-color: transparent;

  & > .above-comment {
    margin-block-end: var(--space-lg-block);
    padding-block-end: 5px;
    /* A featured card's replies set a darker one. */
    border-block-end: 1px solid var(--comment-reply-border, var(--color-comment-reply-border));
    background-color: transparent;
  }

  & > .comment,
  & > .under-comment {
    padding: 0 var(--comment-padding) var(--comment-padding) var(--comment-reply-indent);
  }

  & > .above-comment > .interactions {
    margin-block-start: 8px;
  }

  & > .under-comment > .interactions {
    margin-block-start: 0;
  }
}

@media (max-width: 767px) {
  .manage {
    flex-basis: 100%;
    margin: var(--space-lg-block) 0 0 35px;
    padding: 0;
  }

  .comment {
    padding: var(--space-lg-block) var(--space-lg-block) var(--space-lg-block) var(--comment-padding);
  }

  .under-comment {
    padding: 0 var(--comment-padding) var(--space-lg-block);
  }
}
</style>
