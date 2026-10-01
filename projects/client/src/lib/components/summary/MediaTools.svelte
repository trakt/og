<!-- OG's VIP sidebar links: refresh queues, updated date, and the shared report modal. -->
<script lang="ts">
import { page } from '$app/state';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import ReportDialog from '$lib/components/summary/ReportDialog.svelte';
import type { ReportTarget } from '$lib/components/summary/ReportTarget';
import { writeMediaTool } from '$lib/components/summary/writeMediaTool';
import { toast } from '$lib/components/toast/toast.svelte';
import Icon from '$lib/icons/Icon.svelte';
import flag from '$lib/icons/solid/flag.svg?raw';
import play from '$lib/icons/solid/play.svg?raw';
import refresh from '$lib/icons/solid/arrows-rotate.svg?raw';
import { formatDate } from '$lib/utils/formatDate';

interface Props {
  target: ReportTarget;
  updatedAt?: string | null;
  /** Only display the datasource when the API can establish it. */
  datasource?: string;
}
const { target, updatedAt, datasource }: Props = $props();
let reporting = $state(false);
let pending = $state<'refresh' | 'justwatch' | null>(null);
const canRefresh = $derived(['movie', 'show', 'person'].includes(target.type));
const canRefreshWatchNow = $derived(['movie', 'show'].includes(target.type));
const vip = $derived(page.data.user?.isVip ?? false);

async function run(kind: 'refresh' | 'justwatch') {
  if (pending) return;
  if (!(await userManager().getUser())?.access_token) {
    await login();
    return;
  }
  pending = kind;
  const result = await writeMediaTool({
    fetch: authenticatedFetch({ manager: userManager() }),
    action: { kind, target },
  });
  pending = null;
  if (result.ok) toast.success(result.message);
  else toast.error(result.message);
}
</script>

<!-- VIP billing lives on the main site. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<ul class="media-tools" aria-label="{target.title} tools">
  {#if canRefresh}
    <li>
      {#if vip}
        <button type="button" disabled={pending !== null} aria-busy={pending === 'refresh'} onclick={() => run('refresh')}>
          <Icon svg={refresh} fixedWidth />
          <span>{pending === 'refresh' ? 'Queuing...' : 'Refresh Data'}
            {#if updatedAt}<small>updated {formatDate(updatedAt, { ...page.data.datePreferences, format: 'll' })}</small>{/if}
            {#if datasource}<small>Datasource: {datasource}</small>{/if}
          </span>
        </button>
      {:else}
        <a href="https://trakt.tv/vip/refresh"><Icon svg={refresh} fixedWidth /><span>Refresh Data
          {#if updatedAt && page.data.user}<small>updated {formatDate(updatedAt, { ...page.data.datePreferences, format: 'll' })}</small>{/if}
          {#if datasource}<small>Datasource: {datasource}</small>{/if}
        </span></a>
      {/if}
    </li>
    {#if canRefreshWatchNow && vip}
      <li><button type="button" disabled={pending !== null} aria-busy={pending === 'justwatch'} onclick={() => run('justwatch')}><Icon svg={play} fixedWidth /><span>{pending === 'justwatch' ? 'Queuing...' : 'Refresh Watch Now'}</span></button></li>
    {/if}
  {/if}
  {#if page.data.user}
    <li><button type="button" onclick={() => { reporting = true; }}><Icon svg={flag} fixedWidth /><span>Report {target.type}</span></button></li>
  {/if}
</ul>
<ReportDialog bind:open={reporting} {target} />

<style>
.media-tools {
  margin: 0;
  padding: var(--media-tools-padding);
  border-block-start: 1px solid var(--color-summary-separator);
  list-style: none;
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  text-transform: uppercase;
}
li {
  padding-block: var(--media-tools-row-padding);
}
a,
button {
  display: grid;
  grid-template-columns: var(--media-tools-icon-column) minmax(0, 1fr);
  align-items: baseline;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-media-tools);
  font: inherit;
  line-height: var(--media-tools-line-height);
  text-align: start;
  text-decoration: none;
  text-transform: inherit;
  transition: color var(--transition-card);
  &:is(:hover, :focus-visible) {
    color: var(--color-link);
  }
}
small {
  display: block;
  margin-block-end: var(--media-tools-under-margin);
  font-size: var(--font-size-media-tools-under);
  font-weight: var(--font-weight-headings);
}
</style>
