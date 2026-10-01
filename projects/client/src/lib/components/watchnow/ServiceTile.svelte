<!--
  One streaming service (OG's `.streaming-links a`): its logo on its brand color, or its name when there's no logo,
  a store badge for a channel sold through another service, and the price lines in the modal. Opens the offer in
  a new tab. Its size comes from the parent: `--service-width` and `--service-height`. With no `href` it's a plain
  tile, like the applied filters' in the chart sidebar. `country` badges a service from another country, like the
  settings' favorites. With `onclick` it's a toggle button, OG's onboarding picker: gray until `pressed`, then its
  color and a check.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/solid/check.svg?raw';
import type { ServiceLink } from './watchNow.ts';

interface Props {
  link: ServiceLink;
  /** "Included with", "Subscription". Left out in the sidebar. */
  price?: readonly string[];
  /** The "4K" badge. */
  uhd?: boolean;
  /** The upper-case code in the corner badge. */
  country?: string;
  pressed?: boolean;
  onclick?: () => void;
}

const { link, price = [], uhd = false, country, pressed = false, onclick }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#snippet body()}
  <span class={['icon', { 'on-channel': link.channel }]} style:--service-color={link.color} data-country={country}>
    {#if link.logo}
      <img src={link.logo} alt={link.name} />
    {:else}
      <span class="text">{link.name.replace(/ \((on [^)]+|free)\)$/, '')}</span>
    {/if}
    {#if link.channel}
      <span class="channel"><img src={link.channel} alt="" /></span>
    {/if}
    {#if onclick && pressed}<span class="check"><Icon svg={check} /></span>{/if}
  </span>
  {#if price.length > 0}
    <span class="price">
      {#each price as line, index (index)}{#if index > 0}<br />{/if}{line}{/each}
    </span>
  {/if}
{/snippet}

{#if onclick}
  <button type="button" class={['service', 'toggle', { 'has-country': country, pressed }]} aria-pressed={pressed}
  {onclick}>
    {@render body()}
  </button>
{:else}
  <svelte:element
  this={link.href ? 'a' : 'span'}
  class={['service', { uhd, 'has-country': country }]}
  href={link.href || undefined}
  target={link.href ? '_blank' : undefined}
  rel={link.href ? 'nofollow noopener' : undefined}
>
    {@render body()}
  </svelte:element>
{/if}

<style>
.service {
  display: inline-block;
  inline-size: var(--service-width);
  padding: var(--service-padding);
  color: inherit;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  text-align: center;
  text-decoration: none;
  vertical-align: top;

  &:is(:hover, :focus-visible) {
    color: inherit;
    text-decoration: none;
  }
}

.icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: var(--service-height);
  padding: 6px 10px;
  border: 2px solid var(--service-color);
  border-radius: var(--radius-service);
  background-color: var(--service-color);
  color: var(--color-text-inverse);
  font-size: var(--font-size-small);
  line-height: 1;

  & > img {
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
  }

  &.on-channel > :is(img, .text) {
    block-size: 70%;
    margin-block-end: 20%;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: transform var(--transition-card);

    .service:is(:hover, :focus-visible) & {
      transform: scale(1.05);
    }
  }

  .has-country &::after {
    content: attr(data-country);
    position: absolute;
    inset-block-start: -8px;
    inset-inline-end: -8px;
    padding: var(--service-country-padding);
    border-radius: 50%;
    background-color: var(--color-service-badge-bg);
    box-shadow: 0 0 2px currentColor;
    color: var(--service-color);
    font-size: var(--font-size-service-country);
    font-weight: var(--font-weight-headings-heavy);
  }

  .toggle:not(.pressed) & {
    border-color: var(--color-service-off);
    background-color: var(--color-service-off);
  }

  .toggle & > :is(img, .text) {
    opacity: var(--service-off-opacity);

    @media (prefers-reduced-motion: no-preference) {
      transition: opacity var(--transition-card);
    }
  }

  .toggle:is(:hover, :focus-visible, .pressed) & > :is(img, .text) {
    opacity: 1;
  }

  .uhd &::after {
    content: '4K';
    position: absolute;
    inset-block-start: -8px;
    inset-inline-end: -8px;
    padding: 5px 4px;
    border-radius: 50%;
    background-color: var(--color-service-badge-bg);
    box-shadow: 0 0 2px currentColor;
    color: var(--color-service-badge);
    font-size: 11px;
    font-weight: var(--font-weight-headings-heavy);
  }
}

.text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-weight: var(--font-weight-headings-heavy);
  letter-spacing: 1px;
  line-height: 1.2;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

/* A picked service's check. */
.check {
  position: absolute;
  inset-block-start: -10px;
  inset-inline-end: -10px;
  display: flex;
  padding: var(--service-check-padding);
  border-radius: 50%;
  background-color: var(--color-service-badge-bg);
  color: var(--color-service-badge);
  font-size: var(--font-size-service-check);
  line-height: 1;
}

/* A toggle is a <button>: drop the browser's button look. */
.toggle {
  min-block-size: 0;
  border: 0;
  background: none;
}

/* The store under a channel's logo, split off by a thin line. */
.channel {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 20%;
  display: flex;
  justify-content: center;
  inline-size: 60%;
  block-size: 30%;
  border-block-start: 1px solid rgb(255 255 255 / 0.5);

  & img {
    block-size: 100%;
  }
}

.price {
  display: block;
  padding-block-start: 4px;
  font-size: var(--font-size-small);
  line-height: 1;
}
</style>
