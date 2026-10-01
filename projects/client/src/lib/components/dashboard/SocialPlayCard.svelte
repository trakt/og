<!--
  One Social Feed play: the poster
  alone, then a white box with the watched check and the member's avatar half over the poster's edge, "<name> watched
  <title>" in up to three lines, and the watched date in a gray strip.
-->
<script lang="ts">
import PosterCard from '$lib/components/media/PosterCard.svelte';
import type { SocialPlay } from '$lib/dashboard/toSocialPlay';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check-thick.svg?raw';

const { play }: { play: SocialPlay } = $props();
</script>

<!-- Hrefs point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="social-play">
  <PosterCard href={play.href} title={play.fullTitle} image={play.image} hideTitles />
  <div class="under">
    <span class="check"><Icon svg={check} /></span>
    {#if play.member.href}
      <a class="avatar" href={play.member.href} tabindex="-1" aria-hidden="true"><img src={play.member.avatar} alt=""
          loading="lazy" decoding="async" /></a>
    {:else}
      <span class="avatar"><img src={play.member.avatar} alt="" loading="lazy" decoding="async" /></span>
    {/if}
    <p class="text">
      {#if play.member.href}<a class="username" href={play.member.href}>{play.member.name}</a>{:else}<b>{
            play.member.name
          }</b>{/if}
      watched <a class="title" href={play.href}>{play.watched}</a>
    </p>
  </div>
  <p class="date">{play.date}</p>
</div>

<style>
.social-play {
  min-inline-size: 0;
}

.under {
  position: relative;
  padding: var(--social-under-padding);
  background-color: var(--color-social-under-bg);
  font-size: var(--font-size-social-text);
  text-align: center;
}

.check,
.avatar {
  position: absolute;
  inset-block-start: calc(var(--social-badge-size) / -2);
  inset-inline-start: 50%;
  inline-size: var(--social-badge-size);
  block-size: var(--social-badge-size);
}

/* OG's `.action.watch`: a purple disc with the check, over the avatar's edge. */
.check {
  z-index: 2;
  display: grid;
  place-items: center;
  margin-inline-start: var(--social-check-inset);
  border: var(--social-badge-border) solid var(--color-social-ring);
  border-radius: 50%;
  background-color: var(--brand-tertiary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-social-check);
}

.avatar {
  z-index: 1;
  margin-inline-start: var(--social-avatar-inset);

  & img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
    border: var(--social-badge-border) solid var(--color-social-ring);
    border-radius: 50%;
    background-color: var(--color-social-ring);
  }
}

.text {
  display: -webkit-box;
  block-size: var(--social-text-height);
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.username {
  font-weight: bold;
}

.title {
  color: var(--color-social-link);
}

.date {
  margin: 0;
  padding-block: var(--space-social-date);
  background-color: var(--color-social-date-bg);
  color: var(--color-social-date-text);
  font-size: var(--font-size-social-date);
  text-align: center;
  text-transform: uppercase;
}
</style>
