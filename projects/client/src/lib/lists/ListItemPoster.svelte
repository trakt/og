<!--
  One list item as a poster card: the poster, the
  quick icons, the title and OG's two sort-dependent lines, and the owner's notes over the poster. The list page and
  the dashboard's Watchlist panel both render these.
-->
<script lang="ts">
import { matchesListFade } from '$lib/lists/matchesListFade';
import ReadNotes from '$lib/components/lists/ReadNotes.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { Snippet } from 'svelte';
import type { ListItemCard } from './toListItemCard.ts';

interface Props {
  item: ListItemCard;
  /** Shown when the list displays its numbers. */
  rank?: number;
  /** Page-local eye-menu fade choices; dashboard cards default to none. */
  fade?: readonly string[];
  datePreferences: DatePreferences;
  /** The card leaves with the removal transition. */
  removing?: () => boolean;
  /** Manage mode's controls over the poster, in place of Read Notes. */
  edit?: Snippet<[ListItemCard]>;
}

const { item, rank, datePreferences, removing, edit, fade = [] }: Props = $props();
const state = $derived(item.type === 'person' ? undefined : overlay.state(item.type, item.id, item.seasonOf));
const fill = $derived(quickIconFill({ state: state ?? {}, airedEpisodes: item.airedEpisodes, datePreferences }));
</script>

<PosterCard
  href={item.href}
  title={item.title}
  number={item.number}
  image={item.image}
  episodeBadge={item.episodeBadge}
  subtitles={item.lines}
  faded={fade.some((option) => matchesListFade({ option, notes: item.notes, state: state ?? {}, fill }))}
  userRating={state?.rating}
  {rank}
  {removing}
  icons={item.type === 'person'
    ? {
      // The overlay has no people yet, so their list icon starts empty.
      fill: quickIconFill({ state: {} }),
      listOnly: true,
      listTarget: { type: 'person', id: item.id, title: item.title },
      listLabel: 'Add to list',
    }
    : {
      fill,
      rating: item.rating,
      ratingTarget: { type: item.type, id: item.id, title: item.title },
      watchTarget: { type: item.type, id: item.id, title: item.title, airedEpisodes: item.airedEpisodes,
        season: item.seasonOf },
      watchNow: 'play',
      listLabel: item.type === 'movie' || item.type === 'show' ? 'Add to watchlist' : 'Add to list',
    }}
>
  {#snippet posterOverlay()}
    {#if edit}{@render edit(item)}{:else if item.notes}<ReadNotes notes={item.notes} />{/if}
  {/snippet}
</PosterCard>
