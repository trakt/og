<!--
  Advanced settings: the account limits and the Traktiversary, the gray reset
  band (Reset Browser Data, Reset Profile Image for VIPs, Clear Search History), then the danger zone with Delete
  Account. Every account action asks first, then toasts OG's message. Reset Browser Data only touches og's own cache,
  so it runs straight away under OG's loading veil. Deleting the account signs out.
-->
<script lang="ts">
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { logout } from '$lib/auth/logout';
import { userManager } from '$lib/auth/userManager';
import Container from '$lib/components/container/Container.svelte';
import ConfirmDialog from '$lib/components/dialog/ConfirmDialog.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import LoadingOverlay from '$lib/components/loading/LoadingOverlay.svelte';
import InlineNotice from '$lib/components/notice/InlineNotice.svelte';
import DangerZone from '$lib/components/settings/DangerZone.svelte';
import SettingsBlock from '$lib/components/settings/SettingsBlock.svelte';
import SettingsButton from '$lib/components/settings/SettingsButton.svelte';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import SettingsNotice from '$lib/components/settings/SettingsNotice.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import circleInfo from '$lib/icons/solid/circle-info.svg?raw';
import skull from '$lib/icons/solid/skull.svg?raw';
import trash from '$lib/icons/solid/trash-can.svg?raw';
import rotate from '$lib/icons/thin/arrows-rotate.svg?raw';
import explosion from '$lib/icons/thin/explosion.svg?raw';
import idCard from '$lib/icons/thin/id-card.svg?raw';
import search from '$lib/icons/thin/magnifying-glass.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import AccountLimitsTable from './AccountLimitsTable.svelte';
import type { AdvancedActions } from './AdvancedActions';
import { type AdvancedAction, runAdvancedAction } from './runAdvancedAction';
import type { AccountLimits } from './toAccountLimits';

interface Props {
  data: { expired: boolean; vip: boolean; limits: AccountLimits | null };
  actions?: AdvancedActions;
}

const browserActions: AdvancedActions = {
  run: (action) => runAdvancedAction({ fetch: authenticatedFetch({ manager: userManager() }), action }),
  resetBrowserData: async () => {
    await overlay.reset();
    await invalidateAll();
  },
  signOut: logout,
};

const { data, actions = browserActions }: Props = $props();

// OG's toastr messages . OG's only failure message was the delete one's.
const DONE: Record<AdvancedAction, string> = {
  'reset-cover': 'Your profile image was reset to the default fanart.',
  'clear-search': 'Your search history was cleared.',
  'delete-account': 'Your account has been deleted!',
};
const FAILED = 'Doh! We ran into some sort of error.';
const VIP_BADGE = { kind: 'vip', tag: null, years: null } as const;

let asking = $state<AdvancedAction | null>(null);
let confirmOpen = $state(false);
let busy = $state(false);
let loading = $state<{ message?: string } | null>(null);

function ask(action: AdvancedAction) {
  asking = action;
  confirmOpen = true;
}

async function run(action: AdvancedAction) {
  if (busy) return;
  busy = true;
  // OG veiled the page while the account went.
  if (action === 'delete-account') loading = {};
  try {
    if (!(await actions.run(action))) {
      toast.error(FAILED);
      return;
    }
    toast.success(DONE[action]);
    if (action === 'delete-account') await actions.signOut();
  } finally {
    busy = false;
    loading = null;
  }
}

async function resetBrowserData() {
  if (busy) return;
  busy = true;
  loading = { message: 'Please wait for the caching to fully complete.' };
  try {
    await actions.resetBrowserData();
    toast.success('Your browser data is reset!');
  } catch {
    toast.error(FAILED);
  } finally {
    busy = false;
    loading = null;
  }
}
</script>

<svelte:head>
  <title>Advanced Settings - Trakt</title>
  <meta name="description" content="Your Trakt account limits, browser data, search history and account deletion." />
</svelte:head>

<SettingsHeader current="advanced" />

{#snippet vipLabel()}<span class="title-label"><VipLabel badge={VIP_BADGE} small /></span>{/snippet}

{#if data.expired}
  <section class="limits-zone">
  <Container>
    <NoData>Your session has expired. <a href={resolve('/settings/advanced')} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to change your settings.</NoData>
  </Container>
</section>
{:else}
  {#if data.limits}
    {@const limits = data.limits}
    <section class="limits-zone">
  <Container>
    <SettingsBlock icon={explosion} title="Account Limits"
      help="All account have initial limits. {data.vip ? 'As a VIP member, you have the highest limits available! 🙌' : 'Upgrade to VIP and get higher limits everywhere.'}"
      wide>
      <div class="traktiversary">
        <SettingsNotice emoji="🎉">
          <p>
                {#if limits.traktiversary}<b>{limits.traktiversary}</b>{:else}Your Traktiversary is on <b>{limits.date}</b>.{/if}
                {#if limits.years}Thank you for <b>{limits.years}</b> years of membership!{/if}
              </p>
          <p>
                {#if data.vip}
                  As a <b>VIP</b> member, you have the highest limits available!
                {:else if limits.earnedLists === null}
                  You'll earn an additional list on your Traktiversary date!
                {:else}
                  You've earned <b>{limits.earnedLists}</b> additional {limits.earnedLists === 1 ? 'list' : 'lists'}!
                  {#if limits.maxedOut}<em>You're maxed out with over <b>8</b> years of membership.</em>{/if}
                {/if}
              </p>
        </SettingsNotice>
      </div>
      <AccountLimitsTable rows={limits.rows} vip={data.vip} />
    </SettingsBlock>
  </Container>
</section>
  {/if}

  <section class="reset-zone">
  <Container>
      <SettingsBlock icon={rotate} title="Reset Browser Data" help="Re-cache all your Trakt browser data and fix any errors you might be seeing on the website.">
        <SettingsButton {busy} onclick={resetBrowserData}>Reset Data</SettingsButton>
      </SettingsBlock>
      {#if data.vip}
        <SettingsBlock icon={idCard} title="Reset Profile Image" help="Reset your profile header image to the default fanart." extra={vipLabel}>
          <SettingsButton onclick={() => ask('reset-cover')}>Reset Profile Image</SettingsButton>
        </SettingsBlock>
      {/if}
      <SettingsBlock icon={search} title="Clear Search History" help="Remove all items from your search history. This affects the website and apps.">
        <SettingsButton onclick={() => ask('clear-search')}>Clear Search History</SettingsButton>
      </SettingsBlock>
    </Container>
</section>

  <DangerZone>
  <div class="permanent">
    <SettingsNotice emoji="⚠️" tone="danger">
      <p><b>Deleting anything in this section is permanent and can't be undone!</b></p>
      <p>We recommend exporting your data before doing anything.</p>
    </SettingsNotice>
  </div>
  <SettingsBlock icon={skull} title="Delete Account"
    help="Your personal information will be removed and your statistical data will be anonymized.">
      {#if data.vip}
        <!-- OG can't tell a cancelled VIP from an active one through the API, so every VIP gets the notice. -->
        <div class="vip-notice">
          <InlineNotice svg={circleInfo}>
            <span>Since you're an active Trakt VIP, please <a href="https://trakt.tv/vip" target="_blank" rel="noopener">cancel your VIP membership</a> before deleting your account.</span>
          </InlineNotice>
        </div>
      {:else}
        <SettingsButton variant="danger" icon={trash} onclick={() => ask('delete-account')}>Delete Account</SettingsButton>
      {/if}
    </SettingsBlock>
</DangerZone>
{/if}

{#if asking === 'delete-account'}
  <ConfirmDialog bind:open={confirmOpen} title="Delete Account" yes="Delete Account"
  onconfirm={() => run('delete-account')}>
  <p>☠️ Deleting your account is permanent and can't be undone! Your personal information will be removed and your statistical data will be anonymized.</p>
  <p>Permanently delete your Trakt account?</p>
</ConfirmDialog>
{:else if asking === 'reset-cover'}
  <ConfirmDialog bind:open={confirmOpen} title="Reset Profile Image" yes="Reset Profile Image"
  onconfirm={() => run('reset-cover')}>
  <p>Reset your profile header image to the default fanart?</p>
</ConfirmDialog>
{:else if asking === 'clear-search'}
  <ConfirmDialog bind:open={confirmOpen} title="Clear Search History" yes="Clear Search History"
  onconfirm={() => run('clear-search')}>
  <p>Remove all items from your search history? This affects the website and apps.</p>
</ConfirmDialog>
{/if}

<LoadingOverlay visible={loading !== null} message={loading?.message} />

<style>
.limits-zone {
  /* Keeps the table's bottom margin inside the white band, as Bootstrap's clearfixed container did. */
  display: flow-root;
}

.reset-zone {
  padding-block: var(--settings-reset-padding);
  background-color: var(--color-settings-reset-bg);
}

.traktiversary {
  margin-block-end: var(--gutter);
}

.permanent {
  margin: var(--danger-zone-notice-margin);
}

.vip-notice {
  flex: 1;

  /* OG's 13px `.alert.inline-notice` text; InlineNotice defaults to 12px. */
  & :global(.notice) {
    font-size: var(--font-size-settings-alert);
  }
}

.title-label :global(.label-vip) {
  margin: var(--settings-title-label-margin);
}
</style>
