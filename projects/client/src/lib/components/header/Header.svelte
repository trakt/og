<!--
  OG's fixed top bar: logo, search field, main nav,
  the Apps menu, and Get VIP plus either the profile menu or the join and sign-in buttons.
-->
<script lang="ts">
import { invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import appleTv from '$lib/assets/apple-tv-icon.svg?raw';
import logo from '$lib/assets/trakt-logo-red.png';
import Icon from '$lib/icons/Icon.svelte';
import android from '$lib/icons/brands/android.svg?raw';
import apple from '$lib/icons/brands/apple.svg?raw';
import googlePlay from '$lib/icons/brands/google-play.svg?raw';
import tvCircleCheck from '$lib/icons/kit/solid-tv-circle-check.svg?raw';
import angleDown from '$lib/icons/solid/angle-down.svg?raw';
import bars from '$lib/icons/solid/bars.svg?raw';
import circleUser from '$lib/icons/solid/circle-user.svg?raw';
import moon from '$lib/icons/solid/moon.svg?raw';
import rocketLaunch from '$lib/icons/solid/rocket-launch.svg?raw';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { toast } from '$lib/components/toast/toast.svelte';
import type { DarkKnight } from '$lib/settings/DarkKnight';
import { saveSettings, type SaveSettingsResult } from '$lib/settings/saveSettings';
import { setDarkKnight } from '$lib/settings/setDarkKnight';
import { settingsRequest } from '$lib/settings/settingsRequest';
import { showsDark } from '$lib/settings/showsDark';
import type { SettingsBody } from '$lib/settings/toSettingsPatch';
import { traktUrls } from '$lib/traktUrls';
import { MediaQuery } from 'svelte/reactivity';
import HeaderMenu from './HeaderMenu.svelte';
import HeaderSearch from './HeaderSearch.svelte';
import type { HeaderUser } from './HeaderUser.ts';

interface Props {
  user: HeaderUser | null;
  /** The `search_type` cookie, so SSR renders the search type picker's label. */
  searchType?: string;
  /** The viewer's saved Dark Knight setting, which the profile menu's "Dark Knight" item toggles. */
  darkKnight?: DarkKnight;
  /** Saves the toggled setting. The demo route passes one that doesn't touch the API. */
  save?: (body: SettingsBody) => Promise<SaveSettingsResult>;
}

const browserSave = (body: SettingsBody) =>
  saveSettings({
    request: settingsRequest(authenticatedFetch({ manager: userManager() })),
    body,
    email: null,
    avatar: null,
  });

const { user, searchType, darkKnight: saved = 'false', save = browserSave }: Props = $props();

const sections = $derived([
  ...(user ? [{ title: 'Dashboard', href: '/dashboard' }] : []),
  { title: 'Shows', href: '/shows/trending' },
  { title: 'Movies', href: '/movies/trending' },
  { title: 'Calendar', href: '/calendars' },
  { title: 'Discover', href: '/discover' },
]);

const apps = [
  { title: 'Trakt for iOS', description: 'Works on iPhone & iPad.', href: traktUrls.appStore, icon: apple, big: true },
  { title: 'Trakt for Android', description: 'Works on Android phones.', href: traktUrls.googlePlay, icon: googlePlay },
  { title: 'Trakt for tvOS', description: 'Works on Apple TV.', href: traktUrls.appStore, icon: appleTv, tv: true },
  {
    title: 'Trakt for Android TV',
    description: 'Works on Google & Android TV.',
    href: traktUrls.googlePlay,
    icon: android,
  },
  {
    title: 'Automatically Track',
    description: 'Streaming services & media centers.',
    href: '/apps',
    icon: tvCircleCheck,
  },
  {
    title: 'Community Apps',
    description: 'From our awesome dev community.',
    href: '/apps#community-apps',
    icon: rocketLaunch,
  },
];

const profileTabs = ['History', 'Progress', 'Library', 'Ratings', 'Lists', 'Comments', 'Notes', 'Network'];
const profileLinks = $derived(
  user
    ? [
      { title: 'Profile', href: `/users/${user.slug}` },
      ...profileTabs.map((title) => ({ title, href: `/users/${user.slug}/${title.toLowerCase()}` })),
    ]
    : [],
);

// OG marks a nav link selected when the first path segment matches (`/shows/popular` selects Shows).
const section = $derived(page.url.pathname.split('/')[1]);
const current = (href: string) => (href.split('/')[1] === section ? 'true' : undefined);

// What the page shows now: the saved setting until a toggle answers, and Auto follows the system.
let darkKnight = $derived(saved);
const prefersDark = new MediaQuery('(prefers-color-scheme: dark)');
const dark = $derived(showsDark({ darkKnight, prefersDark: prefersDark.current }));

// OG flips what the page shows and saves it, so from Auto it saves an explicit On or Off (global.js:4011-4017).
async function toggleDarkKnight() {
  const before = darkKnight;
  darkKnight = dark ? 'false' : 'true';
  const done = await setDarkKnight({
    value: darkKnight,
    save,
    reload: invalidateAll,
    notify: toast.error,
    root: document.documentElement,
  });
  if (!done) darkKnight = before;
}
</script>

<!-- Links point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<header class="top-nav">
  <a class="logo" href="/"><img src={logo} alt="Trakt" width="32" height="32" /></a>

  <HeaderSearch savedType={searchType} viewer={user?.slug ?? null} />

  <nav class="links" aria-label="Main">
    {#each sections as link (link.href)}
      <a href={link.href} aria-current={current(link.href)}>{link.title}</a>
    {/each}
    <span class="spacer"></span>
    <HeaderMenu align="center">
      {#snippet trigger()}Apps{/snippet}
      <ul class="apps">
        {#each apps as app (app.title)}
          <li>
            <a href={app.href} target={app.href.startsWith('/') ? undefined : '_blank'}>
              <span class={['app-icon', { big: 'big' in app, tv: 'tv' in app }]}>
                <Icon svg={app.icon} />
              </span>
              <span class="app-title">{app.title}</span>
              <span class="app-description">{app.description}</span>
            </a>
          </li>
        {/each}
      </ul>
    </HeaderMenu>
    <a href={traktUrls.forums} target="_blank">Forums</a>
  </nav>

  <div class="user">
    {#if !user?.isVip}<a class="btn btn-vip" href="/vip">Get VIP</a>{/if}

    <div class="mobile-links">
      <HeaderMenu align="end" label="Menu">
        {#snippet trigger()}<Icon svg={bars} />{/snippet}
        <ul>
          {#each sections as link (link.href)}
            <li><a href={link.href} aria-current={current(link.href)}>{link.title}</a></li>
          {/each}
          <li><a href="/apps">Apps</a></li>
          <li><a href={traktUrls.forums} target="_blank">Forums</a></li>
        </ul>
      </HeaderMenu>
    </div>

    {#if user}
      <div class={['profile', { vip: user.isVip }]}>
        <HeaderMenu align="end">
          {#snippet trigger()}
            <span class="name">{user.firstName}</span>
            <img class="avatar" src={user.avatarUrl} alt="" width="30" height="30" />
            <Icon svg={angleDown} />
          {/snippet}
          <ul>
            {#each profileLinks as link (link.href)}
              <li><a href={link.href}>{link.title}</a></li>
            {/each}
          </ul>
          <hr />
          <ul>
            <li>
              <button type="button" class="dark-knight" aria-pressed={dark} onclick={toggleDarkKnight}>
                Dark Knight <span class="dark-knight-icon"><Icon svg={moon} /></span>
              </button>
            </li>
          </ul>
          <hr />
          <ul>
            {#if user.isVip}<li><a href="/vip">Manage VIP</a></li>{/if}
            <li><a href="/settings">Settings</a></li>
            <li><a href="/logout">Sign Out</a></li>
          </ul>
        </HeaderMenu>
      </div>
    {:else}
      <a class="btn btn-signup" href="/auth/signin">JOIN TRAKT</a>
      <a class="btn btn-signin" href="/auth/signin">SIGN IN</a>
      <a class="btn-auth" href="/auth/signin" aria-label="Sign in"><Icon svg={circleUser} /></a>
    {/if}
  </div>
</header>

<style>
.top-nav {
  position: fixed;
  inset-block-start: 0;
  z-index: var(--z-header);
  display: grid;
  grid-template-columns: 32px 1fr auto auto;
  column-gap: calc(var(--space-lg-inline) * 2);
  align-items: center;
  inline-size: 100%;
  block-size: var(--header-height);
  padding: 0 var(--space-lg-inline) 0 calc(var(--space-lg-inline) * 2);
  background: var(--color-header-bg);
  backdrop-filter: var(--blur-header);
  color: var(--color-header-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  transition: background 0.5s;

  @media (hover: hover) {
    &:hover {
      background: var(--color-header-bg-hover);
    }
  }

  /* OG's body.search-opened */
  &:has(:global(.header-search.focused)) {
    background: var(--color-header-bg-hover);
  }
}

.logo {
  display: flex;
}

/* Main nav */
.links {
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  margin-inline-end: -12px;
  font-size: var(--font-size-nav);

  & > a,
  & :global(.trigger) {
    display: block;
    margin: 0 -4px;
    padding: var(--space-lg-block) var(--space-lg-inline);
    color: var(--color-header-text);
    text-decoration: none;
    text-shadow: var(--text-shadow-headings);
    transition: color 0.5s;

    &:is(:hover, [aria-current]) {
      color: var(--brand-primary);
    }
  }
}

.spacer {
  inline-size: 24px;
}

/* Apps menu rows: a big icon, then a title over a one-line description. */
.apps {
  font-weight: var(--font-weight-headings-light);

  & li + li a {
    border-block-start: 1px solid var(--color-menu-separator);
  }

  & li a {
    display: grid;
    grid-template-columns: 24px auto;
    column-gap: 24px;
    align-items: center;
    padding: var(--space-lg-block) var(--gutter);
    transition: background-color 0.5s, color 0.5s;

    &:is(:hover, :focus-visible) {
      & .app-description {
        color: var(--gray-lighter);
      }
    }
  }
}

.app-icon {
  grid-row: span 2;
  inline-size: 38px;
  font-size: 28px;
  text-align: center;
}

.big {
  font-size: 36px;
}

/* OG's devices/apple-tv-icon.svg, drawn 30px wide. */
.tv {
  font-size: 30px;
}

.app-title {
  font-size: var(--font-size-nav);
  font-weight: var(--font-weight-headings);
  line-height: 1;
}

.app-description {
  color: var(--color-menu-description);
}

/* Right-hand buttons */
.user {
  display: flex;
  align-items: center;
  gap: var(--space-lg-inline);
  white-space: nowrap;
}

.btn {
  padding: var(--space-base-block) var(--space-base-inline);
  border-radius: var(--radius-sm);
  color: var(--color-header-text);
  font-size: var(--font-size-nav);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-base);
  text-decoration: none;
  transition: background-color 0.5s, color 0.5s;
}

.btn-vip {
  background-color: var(--brand-tertiary);

  &:is(:hover, :focus-visible) {
    background-color: var(--color-header-btn-hover-bg);
    color: var(--brand-tertiary);
  }
}

.btn-signup {
  background-color: var(--brand-primary);

  &:is(:hover, :focus-visible) {
    background-color: var(--color-header-btn-hover-bg);
    color: var(--brand-primary);
  }
}

.btn-signin {
  margin-inline-start: calc(4px - var(--space-lg-inline));

  &:is(:hover, :focus-visible) {
    color: var(--brand-primary);
  }
}

.btn-auth {
  display: none;
  color: var(--color-header-text);
  font-size: 21px;

  &:hover {
    color: var(--brand-primary);
  }
}

.profile :global(.trigger),
.mobile-links :global(.trigger) {
  padding: var(--space-base-block) var(--space-lg-inline);
  font-size: var(--font-size-nav);
  line-height: 1;
}

.mobile-links :global(.trigger) {
  padding: var(--space-lg-block) 8px;
}

.profile :global(.trigger) {
  justify-content: end;
  min-inline-size: 130px;
}

.avatar {
  margin: 0 8px;
  border: 2px solid var(--gray-lighter);
  border-radius: 50%;

  .vip & {
    border-color: var(--brand-primary);
  }
}

.dark-knight-icon {
  margin-inline-start: 5px;
  opacity: 0;
  transition: opacity 0.5s;
}

/* Dark knight colors the toggle blue and shows the moon. */
.dark-knight[aria-pressed='true'] {
  color: var(--brand-secondary);

  & .dark-knight-icon {
    opacity: 1;
  }
}

.mobile-links {
  display: none;
}

/* OG's tablet layout: tighter gutters and nav links, and the search shrinks to its icon. */
@media (width <= 1200px) {
  .top-nav {
    column-gap: var(--space-header-tablet);
    padding-inline: var(--space-lg-inline) var(--space-header-tablet);
  }

  .links {
    margin-inline-end: 0;

    & > a,
    & :global(.trigger) {
      padding-inline: var(--space-base-inline);
    }
  }

  .spacer {
    inline-size: var(--space-base-inline);
  }
}

/* OG swaps the nav for a menu button on smaller screens. Montserrat runs wider than OG's font, so it happens at 992px,
   not 768px. */
@media (width < 992px) {
  .top-nav {
    grid-template-columns: 32px 1fr auto;
  }

  .links {
    display: none;
  }

  .mobile-links {
    display: block;
  }
}

/* Phones keep Get VIP and swap Join and Sign In for the account icon. */
@media (width < 768px) {
  .btn-signup,
  .btn-signin,
  .name {
    display: none;
  }

  .btn-auth {
    display: block;
  }

  .profile :global(.trigger) {
    min-inline-size: 0;
  }
}
</style>
