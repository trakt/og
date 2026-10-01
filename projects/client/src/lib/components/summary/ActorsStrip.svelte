<!--
  A summary's "Actors" section : the heading with "All Cast & Crew", a pill tab per
  group with its count ("Cast", or a show's "Series Regulars" and "Guest Stars"), and a row of headshots that scrolls
  sideways. Pointing at one dims the rest. Empty groups get no tab.
-->
<script lang="ts">
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import type { CastMember } from './CastMember.ts';

interface Group {
  readonly id: string;
  readonly label: string;
  readonly cast: readonly CastMember[];
}

interface Props {
  groups: readonly Group[];
  /** The full credits subpage. */
  creditsHref: string;
}

const { groups, creditsHref }: Props = $props();
const tabs = $derived(groups.filter(({ cast }) => cast.length > 0));
</script>

<!-- Person pages og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if tabs.length > 0}
  <div class="actors" id="actors">
  <div class="heading">
    <h2>Actors</h2>
    <SeeMore href={creditsHref} text="All Cast & Crew" />
  </div>
  <PillTabs
    label="Actors"
    tabs={tabs.map(({ id, label, cast }) => ({ id, label, count: cast.length.toLocaleString('en-US') }))}
  >
      {#snippet panel(selected)}
        <ul>
          {#each tabs.find(({ id }) => id === selected)?.cast ?? [] as member (member.href)}
            <li>
              <Tooltip text={[member.name, member.characters, member.episodes].filter(Boolean).join('\n')}>
                {#snippet trigger(tooltip)}
                  <a href={member.href} {...tooltip}>
                    {#if member.image}
                      <img class="headshot" src={member.image} alt="" loading="lazy" decoding="async" />
                    {:else}
                      <span class="headshot"></span>
                    {/if}
                    <span class="name">{member.name}</span>
                    <span class="character">{member.characters || ' '}</span>
                    {#if member.episodes !== undefined}
                      <span class="count">{member.episodes || ' '}</span>
                    {/if}
                  </a>
                {/snippet}
              </Tooltip>
            </li>
          {/each}
        </ul>
      {/snippet}
    </PillTabs>
</div>
{/if}

<style>
.heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-block-start: var(--gutter);

  & h2 {
    margin: 0;
  }
}

ul {
  display: flex;
  margin: 10px 0 var(--gutter);
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
  scrollbar-width: thin;
}

li {
  flex: 0 0 max(var(--actor-width), 90px);
  min-inline-size: 0;
  padding-inline-end: 10px;
}

a {
  display: block;
  text-decoration: none;
  transition: opacity var(--transition-card);

  &:is(:hover, :focus) {
    text-decoration: none;
  }
}

.headshot {
  display: block;
  inline-size: 100%;
  aspect-ratio: var(--ratio-poster);
  object-fit: cover;
  background-color: var(--color-card-bg);
  transition: opacity var(--transition-card);
}

.name,
.character,
.count {
  display: block;
  overflow: hidden;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  line-height: var(--line-height-headings);
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-card);
}

.name {
  margin-block-start: 5px;
  color: var(--color-actor-name);
}

.character {
  margin-block-start: 1px;
  color: var(--color-actor-character);
}

.count {
  margin-block-start: 1px;
  color: var(--color-actor-count);
  text-align: center;
}

/* Like OG, pointing anywhere in the row greys every name and fades every other headshot. */
ul:hover {
  & li:not(:hover) .headshot {
    opacity: 0.7;
  }

  & :is(.name, .character, .count) {
    color: var(--color-actor-dimmed);
  }
}
span.headshot {
  background-image: var(--image-placeholder-poster);
  background-size: cover;
}
</style>
