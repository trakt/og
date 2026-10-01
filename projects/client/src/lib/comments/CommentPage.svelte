<!--
  A comment's own page: the item's slim fanart header with
  "Shout by NAME", the summary sidebar with its section links, then the comment on the page's band and every reply
  under it, oldest first. There's no pagination and no comment form. A reply posted here goes on top of the replies,
  and deleting the comment itself goes on to the item's comments .
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import type { CommentResponse } from '@trakt/api';
import CommentCard from '$lib/components/comments/CommentCard.svelte';
import { authorOf } from '$lib/components/comments/authorOf';
import { commentSettings } from '$lib/components/comments/commentSettings';
import { withoutBlocked } from '$lib/components/comments/withoutBlocked';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import ExternalLinks from '$lib/components/summary/ExternalLinks.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import SubpageTitle from '$lib/components/summary/SubpageTitle.svelte';
import SummaryFrame from '$lib/components/summary/SummaryFrame.svelte';
import SummaryPoster from '$lib/components/summary/SummaryPoster.svelte';
import WatchNow from '$lib/components/watchnow/WatchNow.svelte';
import Icon from '$lib/icons/Icon.svelte';
import commentIcon from '$lib/icons/trakt/comment.svg?raw';
import type { loadComment } from './loadComment.ts';

const { data }: { data: Awaited<ReturnType<typeof loadComment>> } = $props();
const media = $derived(data.media);
let posted = $state<readonly CommentResponse[]>([]);
// Blocked members' replies are dropped.
const replies = $derived([
  ...posted,
  ...withoutBlocked(data.replies, commentSettings(page.data.settings).blocked).filter(({ id }) =>
    !posted.some((reply) => reply.id === id)
  ),
]);
const addReply = (reply: CommentResponse) => (posted = [reply, ...posted]);
// The count and the delete rule go by the replies posted here too.
const comment = $derived({ ...data.comment, replies: data.comment.replies + posted.length });
const author = $derived(authorOf(comment.user));
// The header and the page title go by the comment alone, even on lists.
const type = $derived(comment.review ? 'Review' : 'Shout');
const viewer = $derived(data.user ? { slug: data.user.slug } : null);
const commentsHref = $derived(`${media.href}/comments`);
// API's `' Reply'.pluralize(n)`, with no delimiter in the sidebar.
const repliesWord = (count: number) => (count === 1 ? 'Reply' : 'Replies');
const sections = $derived([
  { label: `Read ${type}`, href: '#read' },
  { label: `${comment.replies} ${repliesWord(comment.replies)}`, href: '#replies' },
  { label: 'All Comments', href: commentsHref },
]);
const replyCount = $derived(replies.length.toLocaleString('en-US'));
const title = $derived(`${media.item.title} ${type.toLowerCase()} by ${author.name}`);
</script>

<!-- Hrefs are built from API slugs, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content={comment.comment} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={comment.comment} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content={new URL(`/comments/${comment.id}`, page.url.origin).href} />
  {#if media.poster}<meta property="og:image" content={media.poster} />{/if}
</svelte:head>

<FanartHeader image={media.fanart} slim>
  <SubpageTitle
    label="{type} by {author.name}"
    parents={media.parents}
    title={media.title}
    year={media.year}
    href={media.href}
  />
</FanartHeader>

<div class="comment-page">
  <span class="band"></span>
  <SummaryFrame label={media.title} fullWidth>
    {#snippet sidebar()}
      <a href={commentsHref}>
        <SummaryPoster image={media.poster} alt={media.item.title} ratingTarget={media.ratingTarget} />
      </a>
      {#if data.watchNow && media.watchNow}
        <WatchNow button={data.watchNow} title={media.watchNow.title} year={media.watchNow.year} fanart={media.fanart} />
      {/if}
      <SectionNav {sections} label="Comment sections" />
      <ExternalLinks links={media.links} />
    {/snippet}

    {#snippet details()}
      <div id="read" class="read">
        <CommentCard
          {comment}
          item={media.item}
          {viewer}
          dateOptions={data.datePreferences}
          repliesAnchor="#replies"
          wide
          read
          onreply={addReply}
          ondelete={() => goto(commentsHref)}
        />
      </div>
      {#if replies.length > 0}
        <h2 id="replies" class="replies-heading">
          <span class="heading-icon"><Icon svg={commentIcon} /></span><strong>{replyCount}</strong>
          {repliesWord(replies.length).toLowerCase()}
        </h2>
        <div class="replies">
          {#each replies as reply (reply.id)}
            <div class="reply">
              <CommentCard
                comment={reply}
                item={media.item}
                {viewer}
                dateOptions={data.datePreferences}
                opSlug={author.slug}
                inheritSpoiler={comment.spoiler}
                onreply={addReply}
              />
            </div>
          {/each}
        </div>
      {/if}
    {/snippet}
  </SummaryFrame>
</div>

<style>
/* OG's `#info-wrapper` with `.above-comment-bg`: a band across the page behind the comment's author row. */
.comment-page {
  position: relative;
}

/* A blocked member's card gets no glow here (`body.comments #info-wrapper .comment-wrapper.blocked`). */
.comment-page :global(.comment-wrapper.blocked) {
  box-shadow: none;
}

.band {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: var(--comment-page-band);
  background-color: var(--color-comment-page-band);
}

/* OG's info column has no top margin here: the author row starts at the band's top edge. */
.read {
  margin-block-start: calc(-1 * var(--gutter));

  &:last-child {
    margin-block-end: calc(-1 * var(--gutter));
  }
}

.replies-heading {
  margin-block: var(--space-heading-section);
}

.heading-icon {
  margin-inline-end: var(--space-heading-icon);

  & :global(.icon) {
    vertical-align: bottom;
  }
}

.reply {
  margin-block-end: var(--gutter);

  /* A deleted reply leaves its wrapper empty. */
  &:not(:has(.comment-wrapper)) {
    display: none;
  }

  &:last-child {
    margin-block-end: 0;
  }
}
</style>
