<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import background from '$lib/assets/dashboard-welcome.jpg';
import Icon from '$lib/icons/Icon.svelte';
import rocket from '$lib/icons/solid/rocket.svg?raw';
import bullhorn from '$lib/icons/solid/bullhorn.svg?raw';
import unlock from '$lib/icons/solid/unlock-keyhole.svg?raw';
import question from '$lib/icons/solid/question.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete-thick.svg?raw';
import reddit from '$lib/icons/brands/reddit-alien.svg?raw';
import mastodon from '$lib/icons/brands/mastodon.svg?raw';
import twitter from '$lib/icons/brands/x-twitter.svg?raw';
import { traktUrls } from '$lib/traktUrls';

const { onhide }: { onhide: () => void } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="welcome" style:background-image="url('{background}')" aria-labelledby="account-welcome-heading">
  <button class="hide" type="button" onclick={onhide}
    aria-label="Hide account welcome"><Icon svg={deleteIcon} /> Hide</button>
  <Container>
    <div class="info">
      <h2 id="account-welcome-heading">Your account is ready!</h2>
      <p
        class="intro">Thanks for joining Trakt, we're happy to have you! We created Trakt to help <a href="/apps">automatically track</a> what you're watching, find where to watch shows &amp; movies, and <a href="/discover">discover</a> what's hot.</p>
      <ol class="steps">
        <li>
          <span class="marker"><Icon svg={rocket} /></span>
          <h3>Dive deeper into Trakt features.</h3>
          <a class="button" href="https://forums.trakt.tv/c/support/tutorials/23" target="_blank"
            rel="noopener">Tutorials ➟</a>
          <a class="button" href="https://forums.trakt.tv/c/support/faq/29" target="_blank" rel="noopener">FAQ ➟</a>
        </li>
        <li>
          <span class="marker"><Icon svg={bullhorn} /></span>
          <h3>Get updates on our social accounts.</h3>
          <a class="button reddit" href={traktUrls.reddit} target="_blank"
            rel="noopener"><Icon svg={reddit} /> Reddit</a>
          <a class="button mastodon" href={traktUrls.mastodon} target="_blank"
            rel="noopener"><Icon svg={mastodon} /> Mastodon</a>
          <a class="button twitter" href={traktUrls.twitter} target="_blank"
            rel="noopener"><Icon svg={twitter} /> Twitter</a>
        </li>
        <li>
          <span class="marker"><Icon svg={unlock} /></span>
          <h3><span class="vip"><VipLabel badge={{ kind: 'vip', tag: null, years: null }} small /></span> unlocks the full potential of Trakt!</h3>
          <a class="button" href="https://trakt.tv/vip" target="_blank" rel="noopener">Learn more ➟</a>
        </li>
        <li>
          <span class="marker"><Icon svg={question} /></span>
          <h3>If you have any questions, we're here to help!</h3>
          <a class="button" href={traktUrls.forums} target="_blank" rel="noopener">Forums ➟</a>
          <a class="button" href="https://forums.trakt.tv/c/release-notes/6" target="_blank"
            rel="noopener">Release Notes ➟</a>
        </li>
      </ol>
    </div>
  </Container>
</section>

<style>
.welcome {
  position: relative;
  background-position: center top;
  background-size: cover;
  background-color: var(--color-profile-placeholder-bg);
  color: var(--color-text-inverse);
}
.welcome::before,
.welcome::after {
  content: '';
  position: absolute;
  inset-block: 0;
}
.welcome::before {
  inset-inline-start: 0;
  inline-size: 60%;
  background-image: var(--gradient-welcome-left);
}
.welcome::after {
  inset-inline-end: 0;
  inline-size: 40%;
  background-image: var(--gradient-welcome-right);
}
.info {
  position: relative;
  inline-size: 75%;
  padding-block: var(--dashboard-welcome-padding);
}
h2 {
  margin: 0 0 var(--gutter);
  color: inherit;
  font-size: var(--font-size-welcome-title);
  font-weight: var(--font-weight-headings);
  line-height: 1;
  text-shadow: var(--text-shadow-headings);
}
.intro {
  margin: var(--gutter) 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-welcome-intro);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--dashboard-welcome-intro-line);
  a {
    color: inherit;
    border-block-end: var(--dashboard-border-width) solid currentColor;
  }
}
.steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: var(--dashboard-welcome-steps-top) 0 0;
  padding-inline-start: var(--welcome-steps-indent);
  list-style: none;
}
li {
  position: relative;
  margin-block-end: var(--gutter);
  padding-block-start: var(--space-base-block);
}
.marker {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(-1 * var(--welcome-step-marker) - var(--space-sm-inline));
  display: grid;
  place-items: center;
  inline-size: var(--welcome-step-marker);
  block-size: var(--welcome-step-marker);
  border-radius: 50%;
  background: var(--color-welcome-marker-bg);
  color: var(--color-welcome-marker);
  font-size: var(--font-size-welcome-marker);
}
h3 {
  margin: var(--space-xs-block) 0 var(--space-sm-block);
  color: var(--gray-light);
  font-family: var(--font-body);
  font-size: var(--font-size-welcome-step);
}

.vip :global(.label-vip) {
  margin-inline: 0 var(--space-base-block);
}
.button {
  display: inline-block;
  margin: var(--space-lg-block) var(--dashboard-avatar-gap) 0 0;
  padding: var(--space-base-block) var(--space-base-inline);
  border: var(--dashboard-border-width) solid transparent;
  border-radius: var(--radius-code);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
  &:is(:hover, :focus-visible) {
    filter: brightness(0.9);
    text-decoration: none;
  }
}
.reddit {
  background: var(--color-dashboard-reddit);
}
.mastodon {
  background: var(--color-dashboard-mastodon);
}
.twitter {
  background: var(--color-dashboard-twitter);
}
.hide {
  position: absolute;
  inset-block-start: var(--space-lg-block);
  inset-inline-end: var(--space-sm-inline);
  z-index: 1;
  min-block-size: 0;
  border: 0;
  background: none;
  color: var(--gray-light);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}
@media (width < 992px) {
  .info {
    inline-size: 100%;
  }
}
@media (width < 768px) {
  .steps {
    grid-template-columns: minmax(0, 1fr);
  }
  h2 {
    font-size: var(--font-size-h1);
  }
}
</style>
