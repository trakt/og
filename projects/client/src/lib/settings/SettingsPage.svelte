<!--
  General settings: the settings header, the sticky section sidebar, and one form of
  collapsible panels with one "Save Settings". Saving sends only what changed, then reloads the layout's settings so
  the header, dates and every page see them, and toasts OG's flash. A failed call keeps the form as typed and lists
  its message above the first panel. The later General panels add a section and a panel here.
-->
<script lang="ts">
import { invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import Container from '$lib/components/container/Container.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import type { HeaderUser } from '$lib/components/header/HeaderUser';
import SettingsErrors from '$lib/components/settings/SettingsErrors.svelte';
import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
import SettingsSaveBar from '$lib/components/settings/SettingsSaveBar.svelte';
import SectionNav from '$lib/components/summary/SectionNav.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import { type DashboardPrefs, dashboardPrefs } from '$lib/dashboard/dashboardPrefs';
import DashboardPanel from '$lib/settings/DashboardPanel.svelte';
import CalendarPanel from '$lib/settings/CalendarPanel.svelte';
import YearReviewPanel from '$lib/settings/YearReviewPanel.svelte';
import ProfilePanel from '$lib/settings/ProfilePanel.svelte';
import ProgressPanel from '$lib/settings/ProgressPanel.svelte';
import { panelAccess } from '$lib/settings/panelAccess';
import { toPanelSettings } from '$lib/settings/toPanelSettings';
import { mergeSettingsBodies } from '$lib/settings/mergeSettingsBodies';
import { toPanelPatch } from '$lib/settings/toPanelPatch';
import AccountPanel from './AccountPanel.svelte';
import AppearancePanel from './AppearancePanel.svelte';
import DateTimePanel from './DateTimePanel.svelte';
import GlobalPanel from './GlobalPanel.svelte';
import RewatchingPanel from './RewatchingPanel.svelte';
import { saveSettings, type SaveSettingsParams, type SaveSettingsResult } from './saveSettings';
import type { SettingsDraft } from './SettingsDraft';
import { settingsRequest } from './settingsRequest';
import SpoilersPanel from './SpoilersPanel.svelte';
import { toDarkKnight } from './toDarkKnight';
import { toSettingsDraft } from './toSettingsDraft';
import { toSettingsPatch } from './toSettingsPatch';
import type { WatchNowChoices } from './WatchNowChoices';
import WatchNowPanel from './WatchNowPanel.svelte';

type Save = (changes: Omit<SaveSettingsParams, 'request'>) => Promise<SaveSettingsResult>;

interface Props {
  data: {
    settings: unknown;
    user: HeaderUser | null;
    expired: boolean;
    year: number;
    prefs?: DashboardPrefs;
    watchNow: WatchNowChoices;
  };
  /** Sends the changes. The demo route passes one that doesn't touch the API. */
  save?: Save;
}

const browserSave: Save = (changes) =>
  saveSettings({ ...changes, request: settingsRequest(authenticatedFetch({ manager: userManager() })) });

const { data, save = browserSave }: Props = $props();

// OG's sidebar also lists the panels the later General issues build; og lists the ones on the page.
const SECTIONS = [
  { label: 'Account', href: '#account' },
  { label: 'Date & Time', href: '#datetime' },
  { label: 'Global', href: '#global' },
  { label: 'Rewatching', href: '#rewatching' },
  { label: 'Watch Now', href: '#watchnow' },
  { label: 'Spoilers', href: '#spoilers' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Calendars', href: '#calendars' },
  { label: 'Year in Review', href: '#yir' },
  { label: 'Profile', href: '#profile' },
  { label: 'Progress', href: '#progress' },
  { label: 'Appearance', href: '#appearance' },
];

const saved = $derived(toSettingsDraft(data.settings));
// svelte-ignore state_referenced_locally
let draft = $state<SettingsDraft | null>(saved && { ...saved });
const access = $derived(panelAccess(data.settings));
const savedPanels = $derived(toPanelSettings(data.settings));
// svelte-ignore state_referenced_locally
let panels = $state(structuredClone(savedPanels));
// svelte-ignore state_referenced_locally
let prefs = $state<DashboardPrefs>({ ...(data.prefs ?? dashboardPrefs.defaults) });
let avatar = $state<string | null>(null);
let errors = $state<readonly string[]>([]);
let busy = $state(false);

async function onsubmit(event: SubmitEvent) {
  event.preventDefault();
  if (!saved || !draft || busy) return;

  const patch = toSettingsPatch({ before: saved, after: draft });
  if (patch.errors.length) {
    errors = patch.errors;
    return;
  }

  busy = true;
  try {
    const panelPatch = toPanelPatch({ before: savedPanels, after: panels, ...access });
    const body = mergeSettingsBodies(patch.body, panelPatch);
    const result = await save({ body, email: patch.email, avatar });
    errors = result.errors;
    if (result.errors.length) {
      if (result.saved) await invalidateAll();
      toast.error('Your settings couldn’t be saved!');
      return;
    }

    if (data.user) dashboardPrefs.save(data.user.slug, prefs);
    await invalidateAll();
    panels = structuredClone(savedPanels);

    avatar = null;
    draft = saved && { ...saved };
    toast.success('Your settings were saved!');
  } finally {
    busy = false;
  }
}
</script>

<svelte:head>
  <title>General Settings - Trakt</title>
  <meta name="description"
    content="Your Trakt account, date and time, browsing, dashboard, calendar, profile and progress settings." />
</svelte:head>

<SettingsHeader current="" />

<section class="main-settings">
  <Container>
    {#if data.expired || !draft}
      <NoData>Your session has expired. <a href={resolve('/settings')} onclick={(event) => { event.preventDefault(); void login(); }}>Sign in</a> to change your settings.</NoData>
    {:else}
      <div class="columns">
        <div class="sidebar">
          <SectionNav sections={SECTIONS} label="Settings sections" spy={false} ruled />
        </div>
        <form {onsubmit} autocomplete="off">
          {#if errors.length}
            {#key errors}<SettingsErrors {errors} />{/key}
          {/if}
          <fieldset disabled={busy}>
          <AccountPanel
            bind:draft
            avatar={avatar ?? data.user?.avatarUrl ?? ''}
            onavatar={(uri) => (avatar = uri)}
            year={data.year}
            emailKnown={saved?.email !== ''}
          />
          <DateTimePanel bind:draft />
          <GlobalPanel bind:draft />
          <RewatchingPanel bind:draft />
          <WatchNowPanel bind:draft choices={data.watchNow} vip={data.user?.isVip === true} />
          <SpoilersPanel bind:draft />
          <DashboardPanel bind:panels bind:prefs {...access} />
          <CalendarPanel bind:panels {...access} />
          <YearReviewPanel bind:panels vip={access.vip} />
          <ProfilePanel bind:panels slug={data.user?.slug ?? draft.username} />
          <ProgressPanel bind:panels slug={data.user?.slug ?? draft.username} type="watched" />
          <ProgressPanel bind:panels slug={data.user?.slug ?? draft.username} type="collected" />
          <AppearancePanel
            darkKnight={toDarkKnight(data.settings)}
            vip={data.user?.isVip === true}
            save={(body) => save({ body, email: null, avatar: null })}
          />
          </fieldset>
          <SettingsSaveBar {busy} />
        </form>
      </div>
    {/if}
  </Container>
</section>

<style>
fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}

.main-settings {
  padding-block-start: var(--settings-top-padding);
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 768px) {
    grid-template-columns:
      calc((100% + var(--gutter)) * 2 / 12 - var(--gutter))
      calc((100% + var(--gutter)) * 9 / 12 - var(--gutter));
    column-gap: var(--gutter);
  }

  @media (min-width: 992px) {
    grid-template-columns:
      calc((100% + var(--gutter)) * 2 / 12 - var(--gutter))
      minmax(0, 1fr);
  }
}

.sidebar {
  display: none;

  @media (min-width: 768px) {
    display: block;
    position: sticky;
    inset-block-start: var(--settings-sidebar-top);
    align-self: start;
  }
}
</style>
