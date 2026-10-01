<!--
  `/users/:id/comments(/:comment_type)(/:type)` and `/users/:id/comments/liked` under the profile frame
: the comment type and media type dropdowns, the counter and the sort, then 30 comments
  a page beside their posters.
-->
<script lang="ts">
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { page } from '$app/state';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import NoData from '$lib/components/empty/NoData.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import SubnavCount from '$lib/components/toolbar/SubnavCount.svelte';
import commentIcon from '$lib/icons/trakt/comment.svg?raw';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { loadUserComments } from './loadUserComments.ts';
import { userCommentMediaTypes } from './userCommentMediaTypes.ts';
import { userCommentTypes } from './userCommentTypes.ts';
import UserCommentWithPoster from './UserCommentWithPoster.svelte';

type Props = {
  data: Awaited<ReturnType<typeof loadUserComments>> & {
    profile: ProfileUser;
    datePreferences: DatePreferences;
    user: HeaderUser | null;
  };
};
const { data }: Props = $props();

const metaType = $derived(data.type === 'all' ? '' : `${data.type.replace(/s$/, '')} `);
const title = $derived(`${data.profile.displayName}'s ${metaType}${data.liked ? 'liked ' : ''}comments`);
const viewer = $derived(data.user ? { slug: data.user.slug } : null);

// Trailing defaults are left off the path: `/comments`, `/comments/reviews`, `/comments/all/movies`.
function segments({ liked = false, commentType = 'all', type = 'all' }) {
  if (liked) return ['liked'];
  if (type !== 'all') return [commentType, type];
  return commentType === 'all' ? [] : [commentType];
}

// OG's `link_params`: the query string without the page.
function href(filters: { liked?: boolean; commentType?: string; type?: string }) {
  const query = new SvelteURLSearchParams(page.url.searchParams);
  query.delete('page');
  const path = [`/users/${data.profile.slug}/comments`, ...segments(filters)].join('/');
  return `${path}${query.size ? `?${query}` : ''}`;
}
const current = (picked: boolean) => (picked ? 'page' : undefined);
</script>

<!-- Filter URLs keep the canonical profile slug and the query string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta
    name="description"
    content="Check out {data.profile.firstName}'s {data.liked ? 'liked' : 'recent'} comments."
  />
</svelte:head>

<SectionToolbar>
  {#snippet filters()}
    <Dropdown label="Comment type">
      {#snippet trigger()}
        {#if data.liked}<span class="alt">Reactions:</span>{/if}
        {userCommentTypes[data.commentType]}
      {/snippet}
      <ul>
        <li class="header" role="presentation">{data.profile.firstName}'s comments</li>
        {#each Object.entries(userCommentTypes) as [commentType, label] (commentType)}
          <li>
            <a
              href={href({ commentType, type: data.type })}
              aria-current={current(!data.liked && data.commentType === commentType)}
            >{label}</a>
          </li>
        {/each}
      </ul>
      <hr />
      <ul>
        <li class="header" role="presentation">Reactions</li>
        <li><a href={href({ liked: true })} aria-current={current(data.liked)}>{userCommentTypes.all}</a></li>
      </ul>
    </Dropdown>
    <Dropdown label="Media type">
      {#snippet trigger()}{userCommentMediaTypes[data.type]}{/snippet}
      <ul>
        {#each Object.entries(userCommentMediaTypes) as [type, label] (type)}
          {#if !data.liked || type === 'all'}
            <li>
              <a
                href={href({ liked: data.liked, commentType: data.commentType, type })}
                aria-current={current(data.type === type)}
              >{label}</a>
            </li>
          {/if}
        {/each}
      </ul>
    </Dropdown>
  {/snippet}
  {#snippet summary()}
    <SubnavCount svg={commentIcon} count={data.itemCount} noun="comment" tooltip="Comments" />
    <Dropdown label="Sort comments">
      {#snippet trigger()}Added Date{/snippet}
      <ul><li><a href={page.url.pathname + page.url.search} aria-current="page">Added Date</a></li></ul>
    </Dropdown>
  {/snippet}
</SectionToolbar>

<section class="comments" aria-label={title}>
  <Container>
    {#if data.entries.length > 0}
      {#if data.page.type === 'paginated'}
        <div class="pagination"><Pagination meta={data.page} label="Comments pages" /></div>
      {/if}
      {#each data.entries as { row, parent } (row.comment.id)}
        <div class="comment">
          <UserCommentWithPoster {row} {parent} {viewer} datePreferences={data.datePreferences} />
        </div>
      {/each}
      {#if data.page.type === 'paginated'}
        <div class="pagination"><Pagination meta={data.page} label="Comments pages" /></div>
      {/if}
    {:else}
      <NoData />
    {/if}
  </Container>
</section>

<style>
.alt {
  color: var(--gray-light);
}
.comments {
  padding-block: var(--user-comments-padding);
}
.comment {
  margin-block-end: var(--gutter);
}
/* `body.comments .pagination-top` and `.pagination-bottom`: 20px under the top one and the page. */
.pagination {
  margin-block-end: var(--gutter);
}
</style>
