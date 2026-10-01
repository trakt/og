<!--
  The comments of a movie, show, season or episode: the subpage frame, a subnav
  with the type dropdown on the left and the sort dropdown and direction on the right, then 100 comments a page with
  pagination above and below. Reviews are featured. The Reviews and Shouts types, the 30-day and Watched sorts and the
  locked-comments notice have no API. "Add comment" opens the new comment form, and what it posts goes on top.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import AddCommentLink from '$lib/components/comments/AddCommentLink.svelte';
import CommentCard from '$lib/components/comments/CommentCard.svelte';
import { commentSettings } from '$lib/components/comments/commentSettings';
import { newComment } from '$lib/components/comments/newComment.svelte';
import NewCommentForm from '$lib/components/comments/NewCommentForm.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SubpageFrame from '$lib/components/summary/SubpageFrame.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import { withoutBlocked } from '$lib/components/comments/withoutBlocked';
import commentsIcon from '$lib/icons/solid/comments.svg?raw';
import { itemCommentsHref, type ItemCommentSortBy, itemCommentSorts } from './itemCommentSort.ts';
import type { loadItemComments } from './loadItemComments.ts';

const { data }: { data: Awaited<ReturnType<typeof loadItemComments>> } = $props();
const title = $derived(`All comments for ${data.media.item.title}`);
const viewer = $derived(data.user ? { slug: data.user.slug } : null);
const count = $derived(`${data.count.toLocaleString('en-US')} ${data.count === 1 ? 'comment' : 'comments'}`);
// Posted here since the page loaded, newest first. Blocked members' comments are dropped.
const comments = $derived([
  ...newComment.posted,
  ...withoutBlocked(data.comments, commentSettings(page.data.settings).blocked),
]);
const href = (by: ItemCommentSortBy, how = data.sort.how) => itemCommentsHref(data.media.href, by, how);
</script>

<!-- The item links are the canonical API slugs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content={title} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={title} />
  {#if data.media.poster}<meta property="og:image" content={data.media.poster} />{/if}
</svelte:head>

{#snippet sortLabel(by: ItemCommentSortBy)}
  {@const sort = itemCommentSorts[by]}
  {sort.label}{#if 'note' in sort}&nbsp;<em>({sort.note})</em>{/if}
{/snippet}

{#snippet subnav()}
  <SectionToolbar inSummary>
    {#snippet filters()}
      <Dropdown>
        {#snippet trigger()}All Comments&nbsp;{/snippet}
        <ul><li><a href={href(data.sort.by)} aria-current="page">All Comments</a></li></ul>
      </Dropdown>
      <AddCommentLink />
    {/snippet}
    {#snippet summary()}
      <span class="sort">
        <Dropdown>
          {#snippet trigger()}{@render sortLabel(data.sort.by)}&nbsp;{/snippet}
          <ul>
            {#each Object.keys(itemCommentSorts) as ItemCommentSortBy[] as by (by)}
              <li><a href={href(by)} aria-current={data.sort.by === by ? 'page' : undefined}>{@render sortLabel(by)}</a></li>
            {/each}
          </ul>
        </Dropdown>
        {#if data.sort.reversible}
          <SortDirection bind:flipped={
            () => data.sort.how === 'desc',
            (next) => goto(href(data.sort.by, next ? 'desc' : 'asc'))
          } />
        {/if}
      </span>
    {/snippet}
  </SectionToolbar>
{/snippet}

<SubpageFrame
  {...data}
  label="All Comments about..."
  icon={commentsIcon}
  sections={[{ label: count, href: '#comments' }]}
  {subnav}
>
  <NewCommentForm item={data.media.item} />
  <div id="comments" class="comments">
    {#if comments.length === 0}
      <NoData>No comments yet. What do you think?</NoData>
    {:else}
      {#if data.page}<Pagination meta={data.page} label="Comments pages" />{/if}
      {#each comments as comment (comment.id)}
        <CommentCard
          {comment}
          item={data.media.item}
          {viewer}
          dateOptions={data.datePreferences}
          featured={comment.review}
          wide
        />
      {/each}
      {#if data.page}<Pagination meta={data.page} label="Comments pages" />{/if}
    {/if}
  </div>
</SubpageFrame>

<style>
.sort {
  display: flex;
  align-items: center;
}

.comments {
  display: grid;
  gap: var(--gutter);
}
</style>
