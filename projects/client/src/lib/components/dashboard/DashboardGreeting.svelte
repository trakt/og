<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import WatchingNowBar from '$lib/components/users/WatchingNowBar.svelte';
import posterBackground from '$lib/assets/poster-bg.jpg';
import Icon from '$lib/icons/Icon.svelte';
import angleRight from '$lib/icons/light/angle-right.svg?raw';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { WatchingNow } from '$lib/users/WatchingNow';
import type { Snippet } from 'svelte';

const { user, memberSince, watching, stats }: {
  user: ProfileUser;
  memberSince: string;
  watching: WatchingNow | null;
  stats?: Snippet;
} = $props();
const cover = $derived(watching?.fanartUrl ?? (user.vip ? user.coverUrl : null));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class={['greeting-cover', { watching, covered: cover }]} aria-labelledby="dashboard-heading">
  <div class="background" style:background-image="url('{cover ?? posterBackground}')"></div>
  {#if cover}<div class="shadow"></div>{/if}
  <Container>
    <div class="greeting">
      <div class="identity">
        <a class="avatar-link" href="/users/{user.slug}" tabindex="-1" aria-hidden="true">
          <img src={user.avatarUrl} alt="" width="72" height="72" />
        </a>
        <div>
          <h1 id="dashboard-heading">Hello, {user.firstName}{#if user.vip}<VipLabel badge={user.vip} />{/if}</h1>
          <p class="joined">Member since <span>{memberSince}</span></p>
        </div>
      </div>
      <a class="profile-link" href="/users/{user.slug}">Your Profile <Icon svg={angleRight} /></a>
    </div>
  </Container>
  {#if stats}<div class="stats">{@render stats()}</div>{/if}
  {#if watching}<WatchingNowBar {watching} owner="self" />{/if}
</section>

<style>
.greeting-cover {
  position: relative;
  padding-block-start: calc(var(--header-height) + var(--dashboard-greeting-top));
  color: var(--color-text-inverse);
  background-color: var(--color-profile-placeholder-bg);
  overflow: hidden;
  &.watching {
    padding-block-end: var(--profile-watching-height);
  }
}
.background,
.shadow {
  position: absolute;
  inset: 0;
}
.background {
  background-size: var(--profile-placeholder-size);
  filter: blur(var(--profile-placeholder-blur));
  background-color: var(--color-profile-placeholder-bg);
  opacity: var(--opacity-profile-placeholder);
  .covered & {
    background-position: center 20%;
    background-size: cover;
    filter: none;
    opacity: 1;
  }
}
.shadow {
  background: var(--gradient-profile-shadow);
}
.greeting {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: start;
  min-block-size: var(--dashboard-greeting-height);
  gap: var(--gutter);
}
.identity {
  display: flex;
  gap: var(--dashboard-avatar-gap);
}
.avatar-link {
  flex-shrink: 0;
  img {
    display: block;
    inline-size: var(--profile-avatar-size-slim);
    block-size: var(--profile-avatar-size-slim);
    border: var(--dashboard-avatar-border) solid var(--color-text-inverse);
    border-radius: 50%;
    object-fit: cover;
  }
}
h1 {
  margin: var(--dashboard-title-top) 0 0;
  color: inherit;
  text-shadow: var(--text-shadow-headings);
}
.joined {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-headings);
  text-transform: uppercase;
  text-shadow: var(--text-shadow-headings);
  span {
    font-weight: var(--font-weight-headings-light);
  }
}
.profile-link {
  margin-block-start: var(--dashboard-profile-top);
  padding: var(--space-sm-block) var(--space-base-block);
  background: transparent;
  border-radius: var(--radius-code);
  color: inherit;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
  white-space: nowrap;
  &:is(:hover, :focus-visible) {
    background: var(--brand-primary);
    text-decoration: none;
  }
}
.stats {
  position: relative;
}
@media (width < 768px) {
  .avatar-link {
    display: none;
  }
  .greeting {
    flex-wrap: wrap;
    padding-block-end: var(--gutter);
  }
  h1 {
    font-size: var(--font-size-h2);
  }
  .profile-link {
    margin-block-start: 0;
  }
}
</style>
