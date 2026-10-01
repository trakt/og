<!--
  In place of the stat boxes when you view your own profile with nothing watched or collected
: four numbered steps to get started.
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import appStore from '$lib/assets/app-store-badge.png';
import googlePlay from '$lib/assets/google-play-badge.png';
import background from '$lib/assets/welcome-mandalorian.jpg';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/solid/check.svg?raw';
import mobile from '$lib/icons/solid/mobile.svg?raw';
import projector from '$lib/icons/solid/projector.svg?raw';
import question from '$lib/icons/solid/question.svg?raw';
import { traktUrls } from '$lib/traktUrls';

// OG's history link redirect.
const HISTORY_TUTORIAL = 'https://forums.trakt.tv/t/how-to-build-your-watched-history/19078';
</script>

<!-- /apps isn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section class="welcome" style:background-image="url({background})" aria-labelledby="welcome-heading">
  <Container>
    <div class="info">
      <h2 id="welcome-heading">You haven't watched anything yet!</h2>
      <p class="intro">
        Your profile will start filling in once you start tracking the shows and movies you've watched. Here's how to get
        started.
      </p>
      <ol class="steps">
        <li>
          <span class="marker"><Icon svg={check} /></span>
          <h3>Learn how to build your watched history.</h3>
          <a class="button" href={HISTORY_TUTORIAL} target="_blank" rel="noopener">Tutorial ➟</a>
        </li>
        <li>
          <span class="marker"><Icon svg={projector} /></span>
          <h3>Scrobble &amp; sync from your media center.</h3>
          <a class="button" href="/apps">Start Scrobbling ➟</a>
        </li>
        <li>
          <span class="marker"><Icon svg={mobile} /></span>
          <h3>Use our mobile apps to track what you watch.</h3>
          <a class="store" href={traktUrls.googlePlay} target="_blank" rel="noopener">
            <img src={googlePlay} alt="Get it on Google Play" />
          </a>
          <a class="store" href={traktUrls.appStore} target="_blank" rel="noopener">
            <img src={appStore} alt="Download on the App Store" />
          </a>
          <a class="button" href="/apps">Apps ➟</a>
        </li>
        <li>
          <span class="marker"><Icon svg={question} /></span>
          <h3>If you have any questions, we're here to help!</h3>
          <a class="button" href={traktUrls.help} target="_blank" rel="noopener">Support ➟</a>
        </li>
      </ol>
    </div>
  </Container>
</section>

<style>
.welcome {
  position: relative;
  background-color: var(--color-profile-placeholder-bg);
  background-position: center top;
  background-size: cover;
  color: var(--color-card-text);

  /* OG's .shade-left and .shade-right. */
  &::before,
  &::after {
    content: '';
    position: absolute;
    inset-block: 0;
  }

  &::before {
    inset-inline-start: 0;
    inline-size: 60%;
    background-image: var(--gradient-welcome-left);
  }

  &::after {
    inset-inline-end: 0;
    inline-size: 40%;
    background-image: var(--gradient-welcome-right);
  }
}

.info {
  position: relative;
  z-index: 1;
  inline-size: 75%;
  padding-block: var(--welcome-hero-padding-block);

  @media (max-width: 767px) {
    inline-size: auto;
  }
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
  max-inline-size: 34em;
  margin: var(--gutter) 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-welcome-intro);
  font-weight: var(--font-weight-headings-light);
  text-wrap: balance;
}

.steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 25px 0 0;
  padding-inline-start: var(--welcome-steps-indent);
  list-style: none;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

li {
  position: relative;
  margin-block-end: var(--gutter);
  padding-block-start: 6px;
}

.marker {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: calc(-1 * var(--welcome-step-marker) - 10px);
  display: grid;
  place-items: center;
  inline-size: var(--welcome-step-marker);
  block-size: var(--welcome-step-marker);
  border-radius: 50%;
  background-color: var(--color-welcome-marker-bg);
  color: var(--color-welcome-marker);
  font-size: var(--font-size-welcome-marker);
  transition: background-color 0.5s, color 0.5s;

  li:hover & {
    background-color: var(--brand-primary);
    color: var(--color-text-inverse);
  }
}

h3 {
  margin: 1px 0 5px;
  color: inherit;
  font-family: var(--font-body);
  font-size: var(--font-size-welcome-step);
}

.button,
.store {
  display: inline-block;
  margin: var(--space-lg-block) 15px 0 0;
  vertical-align: top;
}

.store {
  margin-inline-end: var(--space-lg-block);

  img {
    display: block;
    block-size: var(--welcome-badge-height);
  }
}

.button {
  padding: var(--space-base-block) var(--space-base-inline);
  border-radius: var(--radius-code);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-decoration: none;
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
    color: var(--color-text-inverse);
    text-decoration: none;
  }
}
</style>
