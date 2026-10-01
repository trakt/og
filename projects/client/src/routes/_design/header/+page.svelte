<script lang="ts">
import avatar from '$lib/assets/trakt-logo-red.png';
import Footer from '$lib/components/footer/Footer.svelte';
import Header from '$lib/components/header/Header.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import type { DarkKnight } from '$lib/settings/DarkKnight';
import type { SettingsBody } from '$lib/settings/toSettingsPatch';
import { toTheme } from '$lib/settings/toTheme';

const demoUser = { slug: 'og_red', firstName: 'OG', avatarUrl: avatar };
const users: Record<string, HeaderUser | null> = {
  'Signed out': null,
  'Signed in': { ...demoUser, isVip: false },
  'Signed in, VIP': { ...demoUser, isVip: true },
};

const SETTINGS: ReadonlyArray<readonly [DarkKnight, string]> = [
  ['false', 'Off (OG default)'],
  ['true', 'On (dark knight)'],
  ['auto', 'Auto (uses your system appearance setting)'],
];

let who = $state('Signed out');
let darkKnight = $state<DarkKnight>('false');
const user = $derived(users[who] ?? null);

$effect(() => {
  const root = document.documentElement;
  const before = root.dataset.theme;
  root.dataset.theme = toTheme(darkKnight);
  return () => {
    if (before === undefined) delete root.dataset.theme;
    else root.dataset.theme = before;
  };
});

// The profile menu's "Dark Knight" item saves here instead of the API.
function save(body: SettingsBody) {
  darkKnight = SETTINGS.find(([value]) => value === body.browsing?.dark_knight)?.[0] ?? darkKnight;
  return Promise.resolve({ saved: true, errors: [] });
}
</script>

<svelte:head>
  <title>Header and footer · og design system</title>
</svelte:head>

<Header {user} {darkKnight} {save} />

<main>
  <section>
    <h1>Header and footer</h1>
    <p>
      OG's fixed top bar and footer. Hover or focus Apps and the profile button to open their menus. Below 992px the nav
      moves into the menu button.
    </p>
    <fieldset>
      <legend>User</legend>
      {#each Object.keys(users) as option (option)}
        <label><input type="radio" bind:group={who} value={option} /> {option}</label>
      {/each}
    </fieldset>
    <label>
      Dark Knight
      <select bind:value={darkKnight}>
        {#each SETTINGS as [value, label] (value)}<option {value}>{label}</option>{/each}
      </select>
    </label>
  </section>
</main>

<Footer username={user?.slug ?? null} />

<style>
main {
  padding-block-start: var(--header-height);
}

section {
  min-block-size: 60vh;
  padding: var(--gutter);
}

fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gutter);
  margin-block: var(--gutter);
}
</style>
