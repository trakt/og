<!--
  OG's profile header, shared by every /users/:id page: the cover, avatar, name with the VIP
  and Private labels, the options menu, follow buttons, follower counts, location, the watching-now bar and the
  section tabs. The profile page gets the tall cover when the owner has a cover image; every subpage gets the slim
  one. A private profile the viewer can't see gets the full-height lock screen instead of the tabs.
-->
<script lang="ts">
import { getContext, setContext } from 'svelte';
import { createRelationshipOverlay } from '$lib/users/createRelationshipOverlay.svelte';
import defaultCover from '$lib/assets/profile-cover-default.jpg';
import privateCover from '$lib/assets/profile-cover-private.jpg';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import PrivateLabel from '$lib/components/labels/PrivateLabel.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import Icon from '$lib/icons/Icon.svelte';
import ellipsis from '$lib/icons/regular/ellipsis.svg?raw';
import flag from '$lib/icons/regular/flag.svg?raw';
import genderless from '$lib/icons/solid/genderless.svg?raw';
import locationPin from '$lib/icons/solid/location-pin.svg?raw';
import mars from '$lib/icons/solid/mars.svg?raw';
import skull from '$lib/icons/solid/skull.svg?raw';
import venus from '$lib/icons/solid/venus.svg?raw';
import type { ProfileTab } from '$lib/users/profileTabs';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { ViewerRelation } from '$lib/users/ViewerRelation';
import type { WatchingNow } from '$lib/users/WatchingNow';
import { readableStat } from '$lib/utils/readableStat';
import FollowButtons from './FollowButtons.svelte';
import FollowRequest from './FollowRequest.svelte';
import ProfileTabs from './ProfileTabs.svelte';
import WatchingNowBar from './WatchingNowBar.svelte';

interface Props {
  user: ProfileUser;
  /** From `/users/:id/stats`, which a private profile keeps to itself. */
  counts: { readonly followers: number; readonly following: number } | null;
  watching: WatchingNow | null;
  tabs: readonly ProfileTab[];
  /** The profile page itself, which gets the tall cover when there's an image for it. */
  large?: boolean;
  isSelf: boolean;
  signedIn: boolean;
  /** The viewer's follow state with the owner, streamed in after the page. Null for yourself or signed out. */
  canFollow?: boolean;
  relation: Promise<ViewerRelation | null> | null;
  /** A page's own cover over the owner's, like a VIP owner's list. Watching now still wins. */
  coverUrl?: string;
}

const { user, counts, watching, tabs, large = false, isSelf, signedIn, relation, canFollow = true, coverUrl }: Props =
  $props();

const relationships = getContext<ReturnType<typeof createRelationshipOverlay>>('user-relationships') ??
  createRelationshipOverlay();
setContext('user-relationships', relationships);
const followerCount = $derived(
  Math.max(
    0,
    (counts?.followers ?? 0) +
      (relationships?.state(user.slug, { follow: 'none', followsYou: false, blocked: false, requestId: null })
        .followerDelta ?? 0),
  ),
);

let reporting = $state(false);
const genderIcons = { mars, venus, genderless };
const href = $derived(`/users/${user.slug}`);
const cover = $derived(user.isLocked ? privateCover : (watching?.fanartUrl ?? coverUrl ?? user.coverUrl));
const slim = $derived(!user.isLocked && (!large || !cover));
// OG shaded the tall cover from the middle and the slim and private ones from the left. The default cover has neither.
const overlay = $derived(cover ? (slim || user.isLocked ? 'shadow' : 'shade') : null);
const showOthersControls = $derived(signedIn && !isSelf);
</script>

<!-- Counts and the owner's name link to profile pages other issues build; resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section
  class={['profile-cover', { slim, locked: user.isLocked, watching }]}
  style:--cover="url('{cover ?? defaultCover}')"
>
  {#if overlay}<div class={overlay}></div>{/if}
  {#if user.isLocked}<div class="locked-overlay"></div>{/if}

  <Container>
    <div class="about">
      <a class="avatar-link" {href} tabindex="-1" aria-hidden="true">
        <img class="avatar" src={user.avatarUrl} alt="" width="100" height="100" />
      </a>
      <h1>
        <a {href}>{user.displayName}</a>
        {#if user.vip}<VipLabel badge={user.vip} />{/if}
        {#if user.isPrivate && !user.isLocked}<PrivateLabel />{/if}
        {#if showOthersControls}
          <span class="options">
            <Dropdown variant="circle" label="User options">
              {#snippet trigger()}<Icon svg={ellipsis} />{/snippet}
              <ul>
                <li>
                  <button type="button" onclick={() => { reporting = true; }}><Icon svg={flag} />Report {user.firstName}</button>
                </li>
              </ul>
            </Dropdown>
          </span>
        {/if}
      </h1>

      {#if showOthersControls && relation}
        {#await relation then viewer}
          {#if viewer}
            <div class="buttons">
              {#if viewer.requestId !== null}<FollowRequest firstName={user.firstName} slug={user.slug} isPrivate={user.isPrivate} relation={viewer} />{/if}
              <FollowButtons slug={user.slug} isPrivate={user.isPrivate} relation={viewer} {canFollow} />
            </div>
          {/if}
        {/await}
      {/if}

      <div class="under-name">
        {#if counts}
          <p>
            <a href="{href}/network/followers">
              <span class="count">{readableStat(followerCount)}</span>
              {followerCount === 1 ? 'Follower' : 'Followers'}
            </a>
            <a href="{href}/network/following">
              <span class="count following">{readableStat(counts.following)}</span>
              Following
            </a>
          </p>
        {/if}
        {#if !user.isLocked}
          <p>
            <Icon svg={locationPin} />{user.location}
            <span title={user.gender.title}><Icon svg={genderIcons[user.gender.icon]} label={user.gender.title} /></span>
            {#if user.age !== null}<span class="age" title="Age">{user.age}</span>{/if}
          </p>
        {/if}
      </div>
    </div>
  </Container>

  {#if watching}
    <div class="watching-now">
      <WatchingNowBar {watching} owner={isSelf ? 'self' : { firstName: user.firstName, href }} />
    </div>
  {/if}

  {#if user.isLocked}
    <div class="locked-message">
      <h2>
        <Icon svg={skull} />&nbsp; {user.firstName}'s profile is private <Icon svg={skull} />
      </h2>
      <p>Follow {user.firstName} and you'll be able to see their profile if they accept your request.</p>
    </div>
  {:else}
    <ProfileTabs {tabs} />
  {/if}
</section>

<ReportDialog bind:open={reporting} target={{ type: 'user', id: user.slug, title: user.displayName, href }} />

<style>
.profile-cover {
  position: relative;
  z-index: 1;
  block-size: calc(var(--profile-cover-height) + var(--header-height));
  overflow: hidden;
  background: var(--cover) 50% 20% / cover no-repeat var(--color-page);
  color: var(--color-text-inverse);
  transition: all 0.5s;

  &.watching {
    block-size: var(--profile-cover-height-watching);
  }

  &.slim {
    block-size: calc(var(--profile-cover-height-slim) + var(--header-height));

    &.watching {
      block-size: calc(var(--profile-cover-height-slim-watching) + var(--header-height));
    }
  }

  &.locked {
    block-size: 100vh;
  }
}

.shade,
.shadow,
.locked-overlay {
  position: absolute;
  inset: 0;
}

.shade {
  background: var(--gradient-profile-shade);
}

.shadow {
  background: var(--gradient-profile-shadow);
}

.locked-overlay {
  background-color: var(--color-profile-private-overlay);
}

/* OG's #avatar-wrapper: centered under the header on the tall cover, on the left of the slim one. */
.about {
  position: absolute;
  inset-block-start: calc(var(--profile-avatar-top) + var(--header-height));
  inset-inline-start: 0;
  z-index: 1;
  inline-size: 100%;
  text-align: center;
  transition: inset-block-start 0.5s;

  .slim & {
    position: relative;
    inset-block-start: 0;
    margin-block-start: calc(var(--profile-avatar-top-slim) + var(--header-height));
    text-align: start;
  }

  .locked & {
    inset-block-start: 50%;
    padding-block-end: 50px;
    translate: 0 -50%;
  }
}

.avatar {
  inline-size: var(--profile-avatar-size);
  block-size: var(--profile-avatar-size);
  border: 5px solid var(--color-text-inverse);
  border-radius: 50%;
  background-color: var(--color-text-inverse);
  object-fit: cover;

  .slim & {
    float: inline-start;
    inline-size: var(--profile-avatar-size-slim);
    block-size: var(--profile-avatar-size-slim);
    margin-inline-end: 15px;
    border-width: 3px;
  }
}

h1 {
  margin: 15px 0;
  text-shadow: var(--text-shadow-headings);

  & > a {
    color: var(--color-text-inverse);
  }

  .slim & {
    margin: 0;
    padding-block-start: 6px;
  }
}

.options {
  display: inline-block;
  margin: -5px 0 0 10px;
  vertical-align: middle;
  text-shadow: none;

  & :global(.menu) {
    margin-inline-start: 12px;
  }

  & :global(.menu .icon) {
    margin-inline-end: 10px;
    font-size: var(--font-size-small);
  }

  & :global(.menu button) {
    padding-inline-start: 12px;
  }
}

.buttons {
  margin: 0 0 20px;

  .slim & {
    position: absolute;
    inset-block-start: 20px;
    inset-inline-end: 0;
    margin: 0;
  }
}

.under-name p {
  margin: 5px 0 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-profile-meta);
  line-height: var(--line-height-headings);
  text-shadow: var(--text-shadow-headings);

  .slim & {
    display: inline-block;
    margin: 0;
  }

  & a {
    color: var(--color-text-inverse);
  }

  & :global(.icon) {
    margin: 0 5px 0 10px;
  }
}

.count,
.age {
  font-weight: var(--font-weight-headings);
}

.following {
  margin-inline-start: 10px;
}

/* In OG the bar sits on the tabs. */
.watching-now {
  position: absolute;
  inset-block-end: var(--profile-tabs-height);
  inline-size: 100%;
  block-size: var(--profile-watching-height);
}

.locked-message {
  position: absolute;
  inset-block-end: 0;
  inline-size: 100%;
  background-color: var(--color-profile-private-message-bg);
  text-align: center;

  & h2 {
    margin: 25px 0 15px;
    font-size: var(--font-size-h1);
    font-weight: var(--font-weight-headings);
  }

  & p {
    margin: 0 0 25px;
    font-family: var(--font-headings);
    font-size: var(--font-size-private-subtitle);
    line-height: var(--line-height-headings);
  }
}

/* Phones only have to be usable: the slim cover grows to fit its wrapped lines, and the buttons drop under them. */
@media (width < 768px) {
  .profile-cover.slim {
    block-size: auto;
    padding-block-end: calc(var(--profile-tabs-height) + 15px);

    &.watching {
      padding-block-end: calc(var(--profile-tabs-height) + var(--profile-watching-height) + 15px);
    }
  }

  h1 {
    font-size: var(--font-size-h2);
  }

  .slim .buttons {
    position: static;
    margin-block-start: 10px;
  }

  .locked-message h2 {
    margin: 25px 0 15px;
    font-size: var(--font-size-h2);
  }

  .locked-message p {
    padding-inline: 20px;
    font-size: var(--font-size-h5);
  }
}
</style>
