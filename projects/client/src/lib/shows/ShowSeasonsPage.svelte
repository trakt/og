<!-- `/shows/:id/seasons`: the show's seasons grid under its facts, with "Original Air Date" the only order. -->
<script lang="ts">
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { countLabel } from '$lib/utils/countLabel';
import type { loadShow } from './loadShow.ts';
import SeasonsGrid from './SeasonsGrid.svelte';
import ShowSubpage from './ShowSubpage.svelte';

type Props = {
  data: Awaited<ReturnType<typeof loadShow>> & { datePreferences: DatePreferences };
};

const { data }: Props = $props();
// OG pointed the TMDB link at the show's seasons page here (`official_seasons_page`).
const show = $derived({
  ...data.show,
  links: data.show.links.map((link) => link.label === 'TMDB' ? { ...link, href: `${link.href}/seasons` } : link),
});
const sections = $derived([
  { label: 'Overview', href: '#overview' },
  ...(show.seasonCount > 0
    ? [{
      label: countLabel(show.seasonCount, 'Season'),
      href: '#seasons',
      more: { href: `${show.href}/seasons/all`, text: 'All episodes' },
    }]
    : []),
]);
</script>

<ShowSubpage
  watchNow={data.watchNow}
  privateNotes={data.privateNotes}
  {show}
  heading="Original Air Date"
  seasonLinks={{
    label: 'Order',
    links: [{ text: 'Original Air Date', href: `${show.href}/seasons`, selected: true }],
  }}
  {sections}
>
  <SeasonsGrid showId={show.id} seasons={show.seasons} signedIn={data.signedIn} initialFilters={data.filters}
    datePreferences={data.datePreferences} />
</ShowSubpage>
