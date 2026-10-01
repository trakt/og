<!-- The reaction summary under a comment: an emoji per reaction type that has any, then the total. -->
<script lang="ts">
import Tooltip from '../tooltip/Tooltip.svelte';
import type { ReactionSummary } from './reactionSummary.ts';

interface Props {
  summary: ReactionSummary;
}

const { summary }: Props = $props();
</script>

<span class="reaction-types">
  {#each summary.reactions as reaction (reaction.type)}
    <Tooltip text={reaction.title}>
      {#snippet trigger(tooltip)}
        <span class="reaction-type" role="img" aria-label="{reaction.title} {reaction.type}" {...tooltip}>
          {reaction.emoji}
        </span>
      {/snippet}
    </Tooltip>
  {/each}
  <span class="count-number"><span class="visually-hidden">Reactions: </span>{summary.total}</span>
</span>

<style>
.reaction-types {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
}

.reaction-type {
  margin-inline-end: 2px;
  cursor: default;
}

.count-number {
  margin-inline-start: 3px;
  color: var(--color-comment-reaction);
  font-weight: bold;
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
