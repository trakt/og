<!--
  Notification settings: General Notifications and Digests, one table per
  group with an Email and a Trakt Apps column, and one "Save Settings". Only the Trakt Apps toggles save: the API
  reads the email ones but can't write them, so their column shows them read only (open question 4). Trakt Apps
  always shows, since no field says whether the viewer has the app. The Watch Now and calendar digests, the
  marketing and VIP emails and the notification channels have no API, so og leaves them out.
-->
<script lang="ts">
import NotificationsTable from '$lib/components/settings/NotificationsTable.svelte';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import type { NotificationsColumn } from '$lib/components/settings/NotificationsColumn';
import type { NotificationsRow } from '$lib/components/settings/NotificationsRow';
import envelope from '$lib/icons/solid/envelope.svg?raw';
import bellOn from '$lib/icons/thin/bell-on.svg?raw';
import newspaper from '$lib/icons/thin/newspaper.svg?raw';
import trakt from '$lib/icons/trakt/trakt.svg?raw';
import type { NotificationsDraft } from './NotificationsDraft';
import { saveSettingsBody } from './saveSettingsBody';
import SettingsTabForm from './SettingsTabForm.svelte';
import { toNotificationSettings } from './toNotificationSettings';
import { toNotificationsPatch } from './toNotificationsPatch';

interface Props {
  data: { settings: unknown; expired: boolean };
  /** Sends the changes. The demo route passes one that doesn't touch the API. */
  save?: typeof saveSettingsBody;
}

const { data, save = saveSettingsBody }: Props = $props();

const LEARN_MORE = 'https://forums.trakt.tv/t/email-push-and-desktop-notifications/19083';
const COLUMNS: readonly NotificationsColumn[] = [
  { id: 'email', title: 'Email', icon: envelope, readonly: true },
  { id: 'app', title: 'Trakt Apps', icon: trakt },
];

const settings = $derived(toNotificationSettings(data.settings));
// svelte-ignore state_referenced_locally
let draft = $state<NotificationsDraft | null>(settings && { ...settings.app });

const mention = $derived(`@${settings?.username ?? ''}`);
const groups = $derived<ReadonlyArray<{ title: string; rows: readonly NotificationsRow[] }>>([
  {
    title: 'Network Activity',
    rows: [{
      id: 'new_follower',
      label: settings?.private ? 'Someone wants to follow me' : 'Someone follows me',
    }],
  },
  {
    title: 'Comments',
    rows: [
      { id: 'comment_mention', label: `Someone mentions ${mention} in a comment` },
      { id: 'comment_reply', label: 'Someone replies to my comment' },
      { id: 'comment_like', label: 'Someone likes my comment' },
    ],
  },
  {
    title: 'Lists',
    rows: [
      { id: 'list_comment', label: 'Someone comments on my list' },
      { id: 'list_like', label: 'Someone likes my list' },
      { id: 'pending_collaboration', label: 'Someone invites me to collaborate on a list' },
    ],
  },
]);

// OG's copy, typo included.
const DIGESTS: readonly NotificationsRow[] = [
  {
    id: 'weekly_digest',
    label: 'Weekly trending digest',
    helper: 'Discover shows and movies the community is watching.',
  },
  { id: 'mir', label: 'Month in review stats', helper: 'Personalized show and movie stats for the past month.' },
  {
    id: 'streaming_optimizations',
    label: 'Streaming service optimzations',
    helper: 'Tips to optimize your streaming subscriptions and save money.',
  },
];

/**
 * The Trakt Apps field each row's checkbox edits. There's none for streaming optimizations, and OG's checkbox there
 * edits Month in review's, so og's does too.
 */
const APP_FIELDS: Readonly<Record<string, keyof NotificationsDraft>> = {
  new_follower: 'new_follower',
  comment_mention: 'comment_mention',
  comment_reply: 'comment_reply',
  comment_like: 'comment_like',
  list_comment: 'list_comment',
  list_like: 'list_like',
  pending_collaboration: 'pending_collaboration',
  weekly_digest: 'weekly_digest',
  mir: 'mir',
  streaming_optimizations: 'mir',
};

function checked(row: string, column: string): boolean {
  if (column === 'email') {
    const email: Readonly<Record<string, boolean>> = settings?.email ?? {};
    return email[row] ?? false;
  }
  const field = APP_FIELDS[row];
  return field !== undefined && draft?.[field] === true;
}

function onchange(row: string, column: string, value: boolean) {
  const field = APP_FIELDS[row];
  if (column === 'app' && field !== undefined && draft) draft[field] = value;
}
</script>

<svelte:head>
  <title>Notification Settings - Trakt</title>
  <meta name="description" content="Choose which Trakt notifications you get in the Trakt apps." />
</svelte:head>

<SettingsTabForm
  current="notifications"
  ready={!data.expired && draft !== null}
  save={() => save(settings && draft ? toNotificationsPatch({ before: settings.app, after: draft }) : null)}
  onsaved={() => (draft = settings && { ...settings.app })}
>
  <SettingsSectionHeading
    icon={bellOn}
    help="Get alerts as these actions occur on any of your connected notification channels."
  >
    {#snippet title()}General Notifications{/snippet}
    {#snippet aside()}<SeeMore href={LEARN_MORE} text="Learn More" external />{/snippet}
  </SettingsSectionHeading>
  {#each groups as group (group.title)}
    <NotificationsTable title={group.title} columns={COLUMNS} rows={group.rows} {checked} {onchange}>
      {#snippet label(row)}
        {#if row.id === 'comment_mention'}Someone mentions <b>{mention}</b> in a comment{:else}{row.label}{/if}
      {/snippet}
    </NotificationsTable>
  {/each}

  <SettingsSectionHeading icon={newspaper} help="Regular updates about your activity and the community.">
    {#snippet title()}Digests{/snippet}
  </SettingsSectionHeading>
  <NotificationsTable title="Digests" columns={COLUMNS} rows={DIGESTS} {checked} {onchange} />
</SettingsTabForm>
