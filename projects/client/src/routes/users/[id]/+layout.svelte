<script lang="ts">
import { page } from '$app/state';
import { setContext } from 'svelte';
import { createRelationshipOverlay } from '$lib/users/createRelationshipOverlay.svelte';
import ProfileFrame from '$lib/components/users/ProfileFrame.svelte';
import { profileTabs } from '$lib/users/profileTabs';

const { data, children } = $props();

// A list's comments page has the list's own slim header, not the profile's.
const listComments = $derived(
  [
    '/users/[id]/watchlist/comments',
    '/users/[id]/favorites/comments',
    '/users/[id]/lists/[list]/comments',
  ].includes(page.route.id ?? ''),
);
const relationships = setContext('user-relationships', createRelationshipOverlay());
$effect(() => {
  // A fresh server relation/count or a different viewer replaces the page's optimistic patches.
  void data.relation;
  void data.user?.slug;
  relationships.clear();
});

// A VIP owner's list page puts its first item's fanart on the cover.
const listCover = $derived(typeof page.data.listCover === 'string' ? page.data.listCover : undefined);

const tabs = $derived(profileTabs({ slug: data.profile.slug, pathname: page.url.pathname }));
</script>

<svelte:head>
  {#if data.profile.isLocked}
    <title>{data.profile.displayName}'s profile - Trakt</title>
    <meta name="robots" content="noindex, nofollow, noarchive" />
  {/if}
</svelte:head>

{#if !listComments || data.profile.isLocked}
<ProfileFrame
  user={data.profile}
  counts={data.counts}
  watching={data.watching}
  {tabs}
  large={page.route.id === '/users/[id]'}
  isSelf={data.isSelf}
  signedIn={data.signedIn}
  relation={data.relation}
  canFollow={data.settings?.permissions?.following !== false}
  coverUrl={listCover}
/>
{/if}

{#if !data.profile.isLocked}
  {@render children()}
{/if}
