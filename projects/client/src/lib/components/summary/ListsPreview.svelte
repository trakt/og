<!--
  OG's lists preview on a summary: "Lists" with "All N Lists", then pill
  tabs of list rows. Tabs without lists are left out by the caller. `cut:` "Following" (no API filter).
-->
<script lang="ts">
import { page } from '$app/state';
import ListRow from '$lib/components/media/ListRow.svelte';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import type { ListTab } from '$lib/summary/sectionsClient';
import { countLabel } from '$lib/utils/countLabel';
import SectionHeading from './SectionHeading.svelte';

interface Props {
  tabs: readonly ListTab[];
  /** The item's list count, for "All N Lists". */
  count: number;
  /** The item's page; the see-more link goes to its `/lists`. */
  href: string;
}

const { tabs, count, href }: Props = $props();
</script>

<div class="summary-lists">
  <SectionHeading title="Lists" more={{ href: `${href}/lists`, text: `All ${countLabel(count, 'List')}` }} />
  <PillTabs label="Lists" tabs={tabs.map(({ id, label }) => ({ id, label }))}>
    {#snippet panel(selected)}
      {#each tabs.find(({ id }) => id === selected)?.lists ?? [] as list (list.id)}
        <ListRow {...list} likeTarget={{ id: list.id, ownerSlug: list.kind === 'personal' ? list.owner.slug : undefined, viewer: page.data.user?.slug ?? null }} />
      {/each}
    {/snippet}
  </PillTabs>
</div>

<style>
.summary-lists {
  margin-block-end: var(--gutter);
}
</style>
