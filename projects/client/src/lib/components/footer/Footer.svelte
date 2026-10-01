<!--
  OG's footer: site links, social links, copyright.
-->
<script lang="ts">
import { page } from '$app/state';
import logo from '$lib/assets/trakt-logo-mini-white.png';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import apple from '$lib/icons/brands/apple.svg?raw';
import googlePlay from '$lib/icons/brands/google-play.svg?raw';
import mastodon from '$lib/icons/brands/mastodon.svg?raw';
import redditAlien from '$lib/icons/brands/reddit-alien.svg?raw';
import xTwitter from '$lib/icons/brands/x-twitter.svg?raw';
import messages from '$lib/icons/solid/messages.svg?raw';
import spaceStationMoon from '$lib/icons/solid/space-station-moon.svg?raw';
import { traktUrls } from '$lib/traktUrls';

const { username }: { username: string | null } = $props();

// OG prefills the support message with the page, and the username when signed in.
const help = $derived.by(() => {
  const url = page.url.href;
  if (username === null) {
    return `${traktUrls.help}&body=${encodeURIComponent(`Please describe your issue...\n\n---\n\nPage: ${url}`)}`;
  }
  const body = `Please describe your issue...\n\n---\n\n**Username:** ${username}\n**Page:** [${url}](${url})`;
  return `${traktUrls.helpSignedIn}&body=${encodeURIComponent(body)}`;
});

const social = [
  { title: 'Trakt for iOS', href: traktUrls.appStore, icon: apple },
  { title: 'Trakt for Android', href: traktUrls.googlePlay, icon: googlePlay },
  { title: 'Forums', href: traktUrls.forums, icon: messages },
  { title: 'Reddit', href: traktUrls.reddit, icon: redditAlien },
  { title: 'Mastodon', href: traktUrls.mastodon, icon: mastodon, rel: 'me' },
  { title: 'Twitter', href: traktUrls.twitter, icon: xTwitter },
  { title: 'Status', href: traktUrls.status, icon: spaceStationMoon },
];
</script>

<!-- Links point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<footer>
  <div class="links">
    <nav aria-label="Footer">
      <ul>
        <li><a href="/about">About</a></li>
        <li><a href="/branding">Branding</a></li>
        <li><a href={traktUrls.apiDocs} target="_blank">API</a></li>
        <li><a href={help} target="_blank">Help</a></li>
        <li><a href="/terms">Terms</a></li>
        <li><a href="/privacy">Privacy</a></li>
      </ul>
    </nav>
    <ul class="social">
      {#each social as link (link.title)}
        <li>
          <Tooltip text={link.title}>
            {#snippet trigger(tooltip)}
              <a href={link.href} target="_blank" rel={link.rel} {...tooltip}><Icon svg={link.icon} label={link.title} /></a>
            {/snippet}
          </Tooltip>
        </li>
      {/each}
    </ul>
  </div>
  <p class="copyright">
    <img src={logo} alt="" height="30" width="30" />
    <span>&copy; 2010-{new Date().getFullYear()} trakt, inc. All rights reserved.<br />Hand crafted around the world.</span>
  </p>
</footer>

<style>
footer {
  padding: var(--gutter);
  background: var(--color-page);
  color: var(--color-header-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-footer);
}

a {
  color: inherit;

  &:is(:hover, :focus) {
    color: var(--brand-primary);
    text-decoration: none;
  }
}

ul {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--gutter);
  margin-block-end: var(--gutter);

  & nav li {
    padding-inline-end: 30px;
    text-transform: uppercase;
  }
}

.social {
  flex-wrap: nowrap;
  gap: var(--space-sm-inline);

  & :global(svg) {
    font-size: var(--font-size-nav);
    vertical-align: middle;
  }
}

.copyright {
  display: flex;
  align-items: start;
  gap: 13px;
  margin: 0;
  color: var(--color-footer-muted);
  font-size: var(--font-size-footer-small);

  & img {
    opacity: 0.3;
  }
}

@media (width < 768px) {
  .links {
    flex-direction: column;
  }
}
</style>
