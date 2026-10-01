<!--
  The formatting cheat sheet under a comment textarea. The reply box's sits on the
  card without its grey strip. `cut:` the "all rules" link: `/about/comments` is gone.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import commentIcon from '$lib/icons/regular/comment.svg?raw';

const { id, reply = false }: { id: string; reply?: boolean } = $props();
</script>

<p class={['formatting-help', { reply }]} {id}>
  <span>all rules <Icon svg={commentIcon} /></span>
  <span>:emoji:</span>
  <strong>**bold**</strong>
  <i>_italics_</i>
  <span>~~strike~~</span>
  <span>==highlight==</span>
  <span>&gt;quote</span>
  <code>`code`</code>
  <span>[spoiler] text [/spoiler]</span>
</p>

<style>
.formatting-help {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-sm-inline);
  margin: 0;
  padding: var(--comment-form-help-padding);
  border-radius: var(--radius-comment-form-help);
  background-color: var(--color-comment-form-help-bg);
  color: var(--color-comment-form-help-text);
  font-family: var(--font-body);
  font-size: var(--font-size-comment-form-help);
}

.reply {
  padding-inline-start: var(--comment-reply-help-inset);
  background-color: transparent;
}
</style>
