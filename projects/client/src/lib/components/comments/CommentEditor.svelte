<!--
  The comment card's reply box and edit form. The reply box has
  the viewer's avatar, the textarea, the formatting cheat sheet and Submit. The edit form takes the text's place with the textarea and Submit, plus "Spoiler Alert?" on top-level
  comments. Either opens focused with the cursor at the end. Failures toast OG's message and refocus the textarea.
-->
<script lang="ts">
import type { CommentResponse } from '@trakt/api';
import { toast } from '../toast/toast.svelte.ts';
import CommentAvatar from './CommentAvatar.svelte';
import CommentSubmit from './CommentSubmit.svelte';
import FormattingHelp from './FormattingHelp.svelte';
import type { PostCommentResult } from './postComment.ts';
import SpoilerToggle from './SpoilerToggle.svelte';
import { submitShortcut } from './submitShortcut.ts';

interface Props {
  /** What the textarea starts with: "@author " for a reply, the raw text for an edit. */
  text: string;
  label: string;
  placeholder: string;
  /** Reply boxes show the viewer's avatar and the cheat sheet. */
  avatar?: string;
  /** The edit form's "Spoiler Alert?", set to the comment's flag. Left out, there's no toggle. */
  spoiler?: boolean;
  save: (text: string, spoiler: boolean) => Promise<PostCommentResult>;
  /** The saved comment (null when its body was off-contract), with what was sent. */
  onsaved: (comment: CommentResponse | null, text: string, spoiler: boolean) => void;
}

const { text: initial, label, placeholder, avatar, spoiler: initialSpoiler, save, onsaved }: Props = $props();

const id = $props.id();
// Seeded once: the box is created each time it opens.
// svelte-ignore state_referenced_locally
let text = $state(initial);
// svelte-ignore state_referenced_locally
let spoiler = $state(initialSpoiler ?? false);
let posting = $state(false);
let textarea = $state<HTMLTextAreaElement>();
const reply = $derived(avatar !== undefined);

const focusAtEnd = (element: HTMLTextAreaElement) => {
  element.focus();
  element.setSelectionRange(element.value.length, element.value.length);
};

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (posting) return;
  posting = true;
  const sent = text.trim();
  const result = await save(sent, spoiler);
  posting = false;
  if (!result.ok) {
    toast.error(result.message);
    textarea?.focus();
    return;
  }
  onsaved(result.comment, sent, spoiler);
}
</script>

<div class={['comment-editor', { reply }]}>
  {#if avatar !== undefined}<span class="avatar"><CommentAvatar src={avatar} /></span>{/if}
  <form onsubmit={submit}>
    <textarea
      bind:this={textarea}
      bind:value={text}
      rows="1"
      {placeholder}
      aria-label={label}
      aria-describedby={reply ? `${id}-help` : undefined}
      onkeydown={submitShortcut}
      {@attach focusAtEnd}
    ></textarea>
    <div class="under-help">
      {#if reply}<FormattingHelp id="{id}-help" reply />{/if}
      {#if initialSpoiler !== undefined}<SpoilerToggle bind:spoiler />{/if}
      <CommentSubmit {posting} label={reply ? 'Posting your reply' : 'Saving your comment'} small={!reply} />
    </div>
  </form>
</div>

<style>
/* (`.new-reply-wrapper`, `.new-comment-wrapper.update`) and at
. */
.comment-editor {
  --comment-toggle-bg: var(--color-comment-edit-toggle-bg);
}

.reply {
  display: flex;
  gap: var(--comment-reply-field-gap);
  margin-block-start: var(--gutter);
  text-transform: none;

  & form {
    flex: 1;
    min-inline-size: 0;
  }
}

.avatar {
  flex: none;
}

textarea {
  display: block;
  inline-size: 100%;
  min-block-size: 0;
  padding: var(--comment-inline-input-padding);
  border: 1px solid var(--color-comment-inline-input-border);
  border-radius: var(--radius-comment-inline-input);
  background-color: var(--color-comment-edit-input-bg);
  box-shadow: none;
  font-family: var(--font-body);
  resize: none;
  field-sizing: content;
  transition: border-color 0.5s;

  &:focus {
    border-color: var(--color-comment-inline-input-focus);
    box-shadow: none;
  }

  .reply & {
    background-color: var(--color-comment-reply-input-bg);
  }
}

.under-help {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: var(--gutter);
  margin-block-start: var(--space-lg-block);

  .reply & {
    flex-wrap: nowrap;
    justify-content: space-between;
    margin-block-start: 0;

    & > :global(.submit) {
      flex: none;
      margin-block-start: var(--space-lg-block);
    }
  }
}
</style>
