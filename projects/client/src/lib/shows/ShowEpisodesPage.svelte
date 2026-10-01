<!-- `/shows/:id/seasons/all`: every episode of the show in air order, specials included. -->
<script lang="ts">
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import EpisodeList from './EpisodeList.svelte';
import type { loadShowEpisodes } from './loadShow.ts';
import ShowSubpage from './ShowSubpage.svelte';

type Props = {
  data: Awaited<ReturnType<typeof loadShowEpisodes>> & { datePreferences: DatePreferences; user: HeaderUser | null };
};

const { data }: Props = $props();
const episodes = $derived(data.episodes);
const sections = $derived([
  { label: 'Overview', href: '#overview' },
  ...(episodes.count > 0 ? [{ label: episodes.countLabel, href: '#episodes' }] : []),
]);
</script>

<ShowSubpage
  watchNow={data.watchNow}
  privateNotes={data.privateNotes}
  show={data.show}
  heading="All Episodes"
  years={episodes.years}
  seasonLinks={{ label: 'Season', links: episodes.seasonLinks }}
  {sections}
  previous={episodes.previous}
  next={episodes.next}
>
  {#key data.show.id}
  <EpisodeList showId={data.show.id} signedIn={data.signedIn} initialFilters={data.filters} rows={episodes.rows} datePreferences={data.datePreferences} search vip={data.user?.isVip ?? false} initialTerms={data.terms} initialSort={data.sort} />
  {/key}
</ShowSubpage>
