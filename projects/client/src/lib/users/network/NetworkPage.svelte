<!--
  `/users/:id/network(/:type)` under the profile frame: the subnav with the list picker,
  the people count and the sort menu, then 54 user cards a page with pagination above and below.
-->
<script lang="ts">
import { page } from '$app/state';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import UserCard from '$lib/components/users/UserCard.svelte';
import Icon from '$lib/icons/Icon.svelte';
import userIcon from '$lib/icons/trakt/user.svg?raw';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { ViewerRelation } from '$lib/users/ViewerRelation';
import type { loadNetwork } from './loadNetwork.ts';
import { type NetworkType, networkTypes } from './networkTypes.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadNetwork>> & { profile: ProfileUser };
};

const { data }: Props = $props();
// OG titled the page with the raw type ("Sean's followers"); og spells the pending one out.
const title = $derived(
  `${data.profile.displayName}'s ${data.type === 'following_pending' ? 'following (pending)' : data.type}`,
);
const base = $derived(`/users/${data.profile.slug}/network`);
// OG offers Following (Pending) on your own profile only.
const typeOrder: readonly NetworkType[] = ['following', 'following_pending', 'followers'];
const types = $derived(typeOrder.filter((type) => type !== 'following_pending' || data.isSelf));
const typeHref = (type: NetworkType) => (type === 'following' ? base : `${base}/${type}`);
const relationOf = (relations: Readonly<Record<string, ViewerRelation>> | null, user: ProfileUser) =>
  user.slug === data.viewerSlug ? null : (relations?.[user.slug] ?? null);
</script>

<!-- List URLs keep the canonical profile slug. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out {data.profile.firstName}'s network of friends and followers." />
</svelte:head>

{#snippet typeLabel(type: NetworkType)}
  {#if type === 'following_pending'}Following <em>(Pending)</em>{:else}{networkTypes[type]}{/if}
{/snippet}

{#snippet grid(relations: Readonly<Record<string, ViewerRelation>> | null)}
  <ul class="cards">
    {#each data.users as user (user.slug)}
      <li><UserCard {user} relation={relationOf(relations, user)} canFollow={data.canFollow} /></li>
    {/each}
  </ul>
{/snippet}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown label="Network list">
      {#snippet trigger()}{@render typeLabel(data.type)}{/snippet}
      <ul>
        {#each types as type (type)}
          <li><a href={typeHref(type)} aria-current={data.type === type ? 'page' : undefined}>{@render typeLabel(type)}</a></li>
        {/each}
      </ul>
    </Dropdown>
  {/snippet}
  {#snippet summary()}
    <Tooltip text="People">
      {#snippet trigger(tooltip)}
        <span class="count" {...tooltip}><Icon svg={userIcon} /> {data.itemCount.toLocaleString('en-US')}
          {data.itemCount === 1 ? 'person' : 'people'}</span>
      {/snippet}
    </Tooltip>
    <Dropdown label="Sort people">
      {#snippet trigger()}Added Date{/snippet}
      <ul><li><a href={page.url.pathname + page.url.search} aria-current="page">Added Date</a></li></ul>
    </Dropdown>
  {/snippet}
</SectionToolbar>

<section class="network" aria-label={title}>
  <Container>
    {#if data.users.length > 0}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Network pages" />{/if}
      {#if data.relations}
        {#await data.relations}
          {@render grid(null)}
        {:then relations}
          {@render grid(relations)}
        {:catch}
          {@render grid(null)}
        {/await}
      {:else}
        {@render grid(null)}
      {/if}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Network pages" />{/if}
    {:else}
      <div class="empty"><NoData /></div>
    {/if}
  </Container>
</section>

<style>
.count {
  display: inline-flex;
  gap: var(--user-card-icon-gap);
  align-items: center;
  color: var(--brand-secondary);
  font-family: var(--font-headings);
  font-size: var(--font-size-toolbar-count);
  text-transform: uppercase;

  & :global(.icon) {
    font-size: var(--font-size-icon-lg);
  }
}

.network {
  display: flow-root;
  padding-block-end: var(--gutter);
  container-type: inline-size;

  & :global(nav) {
    margin-block: var(--line-height-computed) 0;
  }
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gutter);
  margin: var(--gutter) 0 0;
  padding: 0;
  list-style: none;
}

/* OG's col-sm-6 and col-xs-12, at Bootstrap's md and sm breakpoints (the section spans the viewport). */
@container (width < 992px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (width < 768px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
}

.empty {
  padding-block-start: var(--line-height-computed);
}
</style>
