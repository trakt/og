<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import AccountWelcomeHero from '$lib/components/dashboard/AccountWelcomeHero.svelte';
import Icon from '$lib/icons/Icon.svelte';
import deleteIcon from '$lib/icons/trakt/delete-thick.svg?raw';
import type { dashboardNotices } from '$lib/dashboard/dashboardNotices';

const { notices, day }: { notices: ReturnType<typeof dashboardNotices>; day: string } = $props();
let hiddenWelcome = $state(false);
let hiddenAnniversary = $state(false);
function hideWelcome() {
  document.cookie = 'og-dashboard-welcome-hidden=1; Path=/; Max-Age=604800; SameSite=Lax';
  hiddenWelcome = true;
}
function hideAnniversary() {
  document.cookie = `og-dashboard-anniversary-hidden=${day}; Path=/; Max-Age=86400; SameSite=Lax`;
  hiddenAnniversary = true;
}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if notices.anniversary && !hiddenAnniversary}
  <section class="anniversary" aria-label="Your Traktiversary">
  <Container>
    <div class="banner">
        <p>
          <strong>Today is your {notices.anniversary} Traktiversary! 🎉</strong>
          {#if notices.additionalLists !== null}<br />You've earned <strong>{notices.additionalLists.toLocaleString('en-US')}</strong> additional {notices.additionalLists === 1 ? 'list' : 'lists'}!{/if}
        </p>
        {#if notices.additionalLists !== null}<a class="details" href="/settings/advanced">View Details ➟</a>{/if}
        <button class="hide" type="button" aria-label="Hide Traktiversary notice" onclick={hideAnniversary}><Icon svg={deleteIcon} /></button>
      </div>
  </Container>
</section>
{/if}
{#if notices.welcome && !hiddenWelcome}<AccountWelcomeHero onhide={hideWelcome} />{/if}

<style>
.anniversary {
  background: var(--color-dashboard-anniversary-bg);
  color: var(--color-dashboard-anniversary-text);
}
.banner {
  display: flex;
  align-items: center;
  gap: var(--gutter);
  padding-block: var(--space-lg-block);
}
p {
  flex: 1;
  margin: 0;
}
.details {
  padding: var(--space-base-block) var(--space-base-inline);
  border-radius: var(--radius-code);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
  white-space: nowrap;
}
.hide {
  padding: var(--space-sm-block);
  border: 0;
  background: none;
  color: inherit;
}
@media (width < 768px) {
  .banner {
    flex-wrap: wrap;
  }
}
</style>
