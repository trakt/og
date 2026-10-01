<!--
  OG's new comment form, under a summary's overview and above an
  item's comments. Hidden until an "Add comment" link opens it; then it fades in, scrolls into view and focuses the
  textarea. Only for members who may comment. It posts in the browser: the new comment goes to the top of the page's
  list, and failures toast and refocus the textarea. Leaving with unposted text asks first.
  `cut:` the X, Mastodon, Tumblr and Medium toggles (the integrations are gone, as on check-in) and the emoji picker.
  The rules links pointed at `/about/comments`, which no longer exists, so the rules are plain text.
-->
<script lang="ts">
import { beforeNavigate } from '$app/navigation';
import { page } from '$app/state';
import type { CommentResponse } from '@trakt/api';
import { tick } from 'svelte';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import type { ViewerSettings } from '$lib/settings/ViewerSettings';
import { toVipBadge } from '$lib/users/toVipBadge';
import CommentAvatar from './CommentAvatar.svelte';
import CommentSubmit from './CommentSubmit.svelte';
import { focusComment } from './focusComment.ts';
import FormattingHelp from './FormattingHelp.svelte';
import type { CommentItem } from './CommentItem';
import { newComment } from './newComment.svelte.ts';
import { postComment } from './postComment.ts';
import SpoilerToggle from './SpoilerToggle.svelte';
import { submitShortcut } from './submitShortcut.ts';
import { wordCount } from './wordCount.ts';

const { item }: { item: CommentItem } = $props();

// The API's 5-word minimum.
const MIN_WORDS = 5;
const UNSAVED = "Your comment hasn't been posted yet! If you leave this page, you'll lose what you wrote.";

const id = $props.id();
// The root layout's `/users/settings`, null logged out.
const settings: ViewerSettings | null = $derived(page.data.settings ?? null);
const user = $derived(settings?.permissions.commenting ? settings.user : null);
const profile = $derived(user ? `/users/${user.ids.slug}` : '');
const badge = $derived(user ? toVipBadge(user) : null);

let text = $state('');
let spoiler = $state(false);
let posting = $state(false);
// OG's `.focused`: the word count, spoiler toggle and Submit show once the textarea has had focus.
let focused = $state(false);
let section = $state<HTMLElement>();
let textarea = $state<HTMLTextAreaElement>();
const words = $derived(wordCount(text));

$effect(() => (user ? newComment.mount() : undefined));

// Each "Add comment" click, after the form is shown.
$effect(() => {
  if (newComment.opened === 0) return;
  void tick().then(() => {
    section?.scrollIntoView({ block: 'start' });
    textarea?.focus({ preventScroll: true });
  });
});

beforeNavigate((navigation) => {
  if (!text.trim() || posting) return;
  if (navigation.to?.url.pathname === location.pathname && navigation.to.url.search === location.search) return;
  // A reload or another site gets the browser's own prompt.
  if (navigation.willUnload) return navigation.cancel();
  if (confirm(UNSAVED)) return;
  navigation.cancel();
  textarea?.focus();
});

// The create response leaves out images unless asked, and the member is the viewer.
const withAvatar = (comment: CommentResponse): CommentResponse =>
  comment.user.images || !settings ? comment : { ...comment, user: { ...comment.user, images: settings.user.images } };

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (posting) return;
  posting = true;
  const result = await postComment({
    fetch: authenticatedFetch({ manager: userManager() }),
    item,
    comment: text.trim(),
    spoiler,
  });
  posting = false;
  if (!result.ok) {
    toast.error(result.message);
    textarea?.focus();
    return;
  }

  text = '';
  spoiler = false;
  newComment.close();
  if (!result.comment) return;
  newComment.add(withAvatar(result.comment));
  await focusComment(result.comment.id);
}
</script>

<!-- The member's page. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if user}
  <section id="new-comment" class="new-comment" bind:this={section} hidden={!newComment.visible}
  aria-labelledby="{id}-title">
  <h2 id="{id}-title"><strong>Add</strong> your comment</h2>
  <div class={['new-comment-wrapper', { focused }]}>
    <header class="above-comment">
      <a class="avatar" href={profile} tabindex="-1" aria-hidden="true">
        <CommentAvatar src={user.images.avatar.full} />
      </a>
      <div class="user-name">
        <p>
            Commenting as <a class="username" href={profile}>{user.name?.trim() || user.username}</a>
            {#if badge}<VipLabel {badge} pill />{/if}
          </p>
        <p class="labels"><strong>Rules:</strong> English only, 5+ words, be respectful, mark spoilers!</p>
      </div>
      <p class={['helpers', { short: words < MIN_WORDS }]} id="{id}-count"><strong>{words}</strong> words</p>
    </header>

    <form onsubmit={submit}>
      <textarea
        bind:this={textarea}
        bind:value={text}
        rows="1"
        placeholder="What do you think?"
        aria-label="Your comment"
        aria-describedby="{id}-count {id}-help"
        onfocus={() => (focused = true)}
        onkeydown={submitShortcut}
      ></textarea>
      <FormattingHelp id="{id}-help" />
      <div class="under-help">
        <SpoilerToggle bind:spoiler />
        <CommentSubmit {posting} label="Posting your comment" />
      </div>
    </form>
  </div>
</section>
{/if}

<style>
.new-comment {
  padding-block-end: var(--gutter);
  scroll-margin-block-start: var(--header-height);

  @media (prefers-reduced-motion: no-preference) {
    animation: fade-in 0.5s;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

h2 {
  margin: 0 0 var(--gutter);
  font-weight: var(--font-weight-headings-light);

  & strong {
    font-weight: var(--font-weight-headings);
  }
}

.above-comment {
  display: flex;
  border-radius: 2px;
  align-items: flex-start;
  padding: var(--comment-padding) var(--comment-padding) var(--space-lg-block);
  background-color: var(--color-comment-header-bg);
}

.avatar {
  flex: none;
  margin: -8px 0 5px -8px;
}

.user-name {
  flex: 1;
  min-inline-size: 0;
  padding-inline-start: var(--space-base-inline);
  margin-block-start: -4px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-comment-meta);
  line-height: var(--line-height-headings);

  & p {
    margin: 0;
  }
}

.username {
  color: var(--color-comment-date);
  font-weight: var(--font-weight-headings);
  transition: color 0.5s;

  &:is(:hover, :focus-visible) {
    color: var(--color-link);
  }
}

.labels {
  padding-block-start: 4px;
}

.helpers {
  align-self: flex-end;
  margin: 0;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-comment-meta);
  opacity: 0;
  transition: opacity 0.5s;

  &.short {
    color: var(--color-comment-form-short);
  }
}

textarea {
  display: block;
  inline-size: 100%;
  min-block-size: 0;
  padding: var(--comment-form-input-padding);
  border: 0;
  background-color: var(--color-comment-form-input-bg);
  box-shadow: none;
  font-family: var(--font-body);
  resize: none;
  field-sizing: content;

  &:focus {
    box-shadow: none;
  }
}

.under-help {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--gutter);
  max-block-size: 0;
  overflow: hidden;
  opacity: 0;
  transition: all 0.5s;

  @media (width < 768px) {
    gap: var(--gutter) 0;
  }
}

.focused {
  & .helpers {
    opacity: 1;
  }

  & .under-help {
    max-block-size: none;
    padding-block-start: var(--gutter);
    opacity: 1;
  }
}

.under-help > :global(.submit) {
  @media (width < 768px) {
    flex-basis: 100%;
  }
}
</style>
