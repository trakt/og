<!--
  A member's comment beside its item's poster, on the profile and the comments pages
: the poster with the viewer's overlay state and quick icons, then the
  card in the wide style, featured for reviews. A reply shows its parent collapsed above the text and, like OG, no
  reply links.
-->
<script lang="ts">
import type { CommentResponse } from '@trakt/api';
import CommentCard from '$lib/components/comments/CommentCard.svelte';
import type { CommentViewer } from '$lib/components/comments/CommentViewer';
import CommentWithPoster from '$lib/components/comments/CommentWithPoster.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { UserComment } from './UserComment.ts';

interface Props {
  row: UserComment;
  viewer: CommentViewer;
  datePreferences: DatePreferences;
  /** The comment a reply answers. */
  parent?: CommentResponse;
}

const { row, viewer, datePreferences, parent }: Props = $props();
const { comment, item, inlineTitle, poster } = $derived(row);
const state = $derived(poster.type === 'list' ? {} : overlay.state(poster.type, poster.id, poster.seasonOf));
</script>

<CommentWithPoster
  poster={{
    href: poster.href,
    title: poster.title,
    number: poster.number,
    image: poster.image,
    variant: poster.variant,
    subtitles: poster.show ? [poster.show] : [],
    userRating: state.rating,
    icons: poster.type === 'list' ? undefined : {
      fill: quickIconFill({ state, airedEpisodes: poster.airedEpisodes, datePreferences }),
      rating: poster.rating,
      watchNow: 'play',
      listLabel: poster.type === 'movie' || poster.type === 'show' ? 'Add to watchlist' : 'Add to list',
    },
  }}
  {inlineTitle}
>
  <CommentCard
    {comment}
    {item}
    {viewer}
    {parent}
    dateOptions={datePreferences}
    featured={comment.review}
    hideInteractions={comment.parent_id > 0}
    wide
  />
</CommentWithPoster>
