<!--
  OG's user card, three to a row on the network page: the user's cover (the default
  one when unset), then an info panel that rides up over it with the avatar, the name with the VIP and Private labels,
  the location and gender line, and the follow buttons. A private user's card leaves the location line blank.
  `relation` is the viewer's follow state with this user; pass null for your own card or when signed out, which
  leaves the button row empty. Buttons update the viewer's relationship immediately, with rollback on a failed write.
    <UserCard user={toProfileUser(row.user)} relation={relations[row.user.ids.slug]} />
-->
<script lang="ts">
import FollowButtons from '$lib/components/users/FollowButtons.svelte';
import defaultCover from '$lib/assets/profile-cover-default.jpg';
import PrivateLabel from '$lib/components/labels/PrivateLabel.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import Icon from '$lib/icons/Icon.svelte';
import genderless from '$lib/icons/solid/genderless.svg?raw';
import locationPin from '$lib/icons/solid/location-pin.svg?raw';
import mars from '$lib/icons/solid/mars.svg?raw';
import venus from '$lib/icons/solid/venus.svg?raw';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { ViewerRelation } from '$lib/users/ViewerRelation';

interface Props {
  user: ProfileUser;
  relation?: ViewerRelation | null;
  canFollow?: boolean;
}

const { user, relation = null, canFollow = true }: Props = $props();
const genderIcons = { mars, venus, genderless };
const href = $derived(`/users/${user.slug}`);
</script>

<!-- Profile links go to /users/:id pages, some of which other issues build; resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="user-card">
  <a class="cover" {href} tabindex="-1" aria-hidden="true">
    <img src={user.coverUrl ?? defaultCover} alt="" loading="lazy" />
  </a>
  <div class="info-wrapper">
    <a class="avatar" {href} tabindex="-1" aria-hidden="true">
      <img src={user.avatarUrl} alt="" loading="lazy" />
    </a>
    <div class="info">
      <h2 class="name">
        <a {href}>{user.displayName}</a>
        {#if user.vip}<VipLabel badge={user.vip} pill />{/if}
        {#if user.isPrivate}<PrivateLabel smaller />{/if}
      </h2>
      {#if user.isPrivate}
        <p class="blank">&nbsp;</p>
      {:else}
        <p class="location">
          <Icon svg={locationPin} />{user.location}
          <span class="gender" title={user.gender.title}>
            <Icon svg={genderIcons[user.gender.icon]} label={user.gender.title} />
          </span>
        </p>
      {/if}
      <div class="buttons">
        {#if relation}
          <FollowButtons slug={user.slug} isPrivate={user.isPrivate} {relation} {canFollow} variant="card" />
        {/if}
        <!-- OG's trailing blank button: it keeps the row's height when there's no button to show. -->
        <span class="btn spacer" aria-hidden="true">&nbsp;</span>
      </div>
    </div>
  </div>
</div>

<style>
.user-card a {
  color: inherit;
}

.cover {
  display: block;
  overflow: hidden;
  border-radius: var(--user-card-radius) var(--user-card-radius) 0 0;
  background-color: var(--color-surface);

  & img {
    display: block;
    inline-size: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
}

.info-wrapper {
  position: relative;
  display: grid;
  grid-template-columns: var(--user-card-avatar-column) minmax(0, 1fr);
  margin-block-start: calc(-1 * var(--user-card-overlap));
  overflow: clip;
  border-radius: 0 0 var(--user-card-radius) var(--user-card-radius);
  background: linear-gradient(
    to bottom,
    transparent var(--user-card-overlap),
    var(--color-user-card-info-bg) var(--user-card-overlap)
  );
}

.avatar {
  margin-inline-start: var(--user-card-avatar-inset);

  & img {
    display: block;
    box-sizing: border-box;
    inline-size: var(--user-card-avatar-size);
    block-size: var(--user-card-avatar-size);
    border: 3px solid var(--color-avatar-border);
    border-radius: 50%;
    background-color: var(--color-avatar-border);
    object-fit: cover;
  }
}

.info {
  padding: var(--user-card-info-padding);
}

.name {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-user-card-name);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  white-space: nowrap;
}

.location,
.blank {
  margin: 0;
}

.location {
  font-size: var(--font-size-small);
  white-space: nowrap;

  & :global(.icon) {
    margin: 0 var(--user-card-icon-gap) 0 0;
  }
}

.gender :global(.icon) {
  margin-inline-start: var(--user-card-icon-lead);
}

.buttons {
  white-space: nowrap;
}

.btn {
  display: inline-block;
  margin: var(--user-card-btn-gap) var(--user-card-btn-gap) 0 0;
  padding: var(--user-card-btn-padding);
  border: 1px solid var(--btn-bg);
  border-radius: var(--radius-sm);
  background-color: var(--btn-bg);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-base);
  text-transform: uppercase;
  vertical-align: middle;
  cursor: default;

  & :global(.icon) {
    margin-inline-end: var(--user-card-btn-icon-gap);
  }
}

.spacer {
  --btn-bg: transparent;

  visibility: hidden;
  inline-size: 0;
  padding-inline: 0;
  border-inline-width: 0;
}
</style>
