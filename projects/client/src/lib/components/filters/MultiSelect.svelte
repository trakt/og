<!--
  OG's Chosen multi-select, as the advanced filters used it: picked values as chips inside a dark field, and a
  searchable list that drops under it, grouped, with small tags on the right ("US", "Free"). A combobox with
  `aria-activedescendant`: typing filters (anywhere in the name), arrows move, Enter picks or unpicks, Esc closes,
  and Backspace in an empty field drops the last chip. Picked options stay in the list, greyed, like Chosen's.
    <MultiSelect bind:value={genres} options={[{ options: genreOptions }]} label="Genres"
      placeholder="Choose genres..." />
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import xmark from '$lib/icons/solid/xmark.svg?raw';
import type { FilterOption, FilterOptionGroup } from './filterOptions.ts';

interface Props {
  value: readonly string[];
  options: readonly FilterOptionGroup[];
  label: string;
  placeholder: string;
  /** Names a picked value the options don't have (yet): they load when the panel first opens. */
  labelFor?: (value: string) => string;
  /** The options are still loading. */
  loading?: boolean;
  disabled?: boolean;
  variant?: 'list';
}

let {
  value = $bindable(),
  options,
  label,
  placeholder,
  labelFor = (v: string) => v,
  loading = false,
  disabled = false,
  variant,
}: Props = $props();

const id = $props.id();
let open = $state(false);
let search = $state('');
let highlight = $state(0);
let input = $state<HTMLInputElement>();
let list = $state<HTMLElement>();

const byValue = $derived(new Map(options.flatMap((group) => group.options).map((option) => [option.value, option])));
const chips = $derived(value.map((v) => ({ value: v, label: byValue.get(v)?.label ?? labelFor(v) })));

const matches = (option: FilterOption, term: string) =>
  option.label.toLowerCase().includes(term) || (option.tag?.toLowerCase().includes(term) ?? false);

const groups = $derived.by(() => {
  const term = search.trim().toLowerCase();
  return options
    .map((group) => ({ ...group, options: term ? group.options.filter((o) => matches(o, term)) : group.options }))
    .filter((group) => group.options.length > 0);
});
const flat = $derived(groups.flatMap((group) => group.options));
const activeId = $derived(open && flat.at(highlight) ? `${id}-option-${highlight}` : undefined);

function toggle(option: FilterOption | undefined) {
  if (!option || disabled) return;
  value = value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value];
  search = '';
}

function remove(v: string) {
  value = value.filter((other) => other !== v);
  input?.focus();
}

function move(by: number) {
  if (flat.length === 0) return;
  open = true;
  highlight = (highlight + by + flat.length) % flat.length;
  list?.querySelector(`#${CSS.escape(`${id}-option-${highlight}`)}`)?.scrollIntoView({ block: 'nearest' });
}

function onkeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') move(open ? 1 : 0);
  else if (event.key === 'ArrowUp') move(-1);
  else if (event.key === 'Enter' && open) toggle(flat.at(highlight));
  else if (event.key === 'Escape' && open) open = false;
  else if (event.key === 'Backspace' && search === '' && value.length > 0) value = value.slice(0, -1);
  else return;
  event.preventDefault();
  event.stopPropagation();
}

function oninput() {
  open = true;
  highlight = 0;
}

function onfocusout(event: FocusEvent & { currentTarget: HTMLElement }) {
  if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
  open = false;
  search = '';
}

// One set of handlers on the list instead of one per option: the network list has thousands.
const optionAt = (event: Event) => {
  const index = event.target instanceof Element
    ? event.target.closest<HTMLElement>('[data-index]')?.dataset.index
    : null;
  return index === undefined || index === null ? undefined : Number(index);
};

const rows = $derived(groups.map((group, g) => {
  const start = groups.slice(0, g).reduce((count, other) => count + other.options.length, 0);
  return { label: group.label, rows: group.options.map((option, index) => ({ option, index: start + index })) };
}));
</script>

<div class={['multi-select', variant, { open }]} {onfocusout}>
  <!-- A click anywhere in the field lands in the search box, like Chosen's. -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="field" onclick={() => input?.focus()}>
    {#each chips as chip (chip.value)}
      <span class="chip">{chip.label}<button type="button" class="remove" aria-label="Remove {chip.label}"
          onclick={(event) => {
            event.stopPropagation();
            remove(chip.value);
          }}><Icon svg={xmark} /></button></span>
    {/each}
    <input
      bind:this={input}
      bind:value={search}
      type="text"
      role="combobox"
      aria-label={label}
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls="{id}-list"
      aria-activedescendant={activeId}
      autocomplete="off"
      spellcheck="false"
      placeholder={placeholder}
      {disabled}
      onclick={() => { if (!disabled) open = true; }}
      {oninput}
      {onkeydown}
    />
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <ul
    id="{id}-list"
    class="drop"
    role="listbox"
    aria-label={label}
    aria-multiselectable="true"
    tabindex="-1"
    hidden={!open}
    bind:this={list}
    onpointerdown={(event) => event.preventDefault()}
    onclick={(event) => toggle(flat.at(optionAt(event) ?? -1))}
    onpointermove={(event) => {
      const index = optionAt(event);
      if (index !== undefined) highlight = index;
    }}
  >
    {#if loading && flat.length === 0}
      <li class="note" role="presentation">Loading...</li>
    {:else if flat.length === 0}
      <li class="note" role="presentation">No results match "{search}"</li>
    {/if}
    {#each rows as group, g (g)}
      {#if group.label}
        <li class="group-label" role="presentation" id="{id}-group-{g}">{group.label}</li>
      {/if}
      {#each group.rows as { option, index } (option.value)}
        <li
          id="{id}-option-{index}"
          role="option"
          data-index={index}
          aria-selected={value.includes(option.value)}
          class={{ grouped: group.label, highlighted: index === highlight }}
        >{#if option.avatar}<img class="option-avatar" src={option.avatar} alt="" />{/if}{#if option.tag}<span class="tag">{option.tag}</span>{/if}{option.label}</li>
      {/each}
    {/each}
  </ul>
</div>

<style>
.list {
  --color-filter-control-bg: var(--color-input-bg);
  --color-filter-control-text: var(--color-text);
  --filter-control-height: var(--list-collaborators-height);
  --radius-filter-control: 0;
  --color-filter-chip-bg: var(--color-list-candidate-chip);
  --color-filter-chip-remove: var(--color-text-muted);
}
.list .chip {
  margin-block: var(--space-xs-inline);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}
.list .field input {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
}
.list .chip ~ input {
  flex-basis: 100%;
  min-block-size: var(--list-select-height);
}
.list .field {
  border: var(--list-border) solid var(--color-input-border);
}
.option-avatar {
  inline-size: var(--list-candidate-avatar);
  block-size: var(--list-candidate-avatar);
  border-radius: 50%;
  vertical-align: middle;
  margin-inline-end: var(--space-xs-inline);
}

.multi-select {
  position: relative;
  min-inline-size: 0;
  font-size: var(--font-size-filter-control);
}

.field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-block-size: var(--filter-control-height);
  padding: 0 var(--space-xs-inline);
  border-radius: var(--radius-filter-control);
  background-color: var(--color-filter-control-bg);
  color: var(--color-filter-control-text);
  cursor: text;

  &:has(input:focus-visible) {
    outline: 2px solid var(--color-input-border-focus);
    outline-offset: 0;
  }
}

.chip {
  position: relative;
  margin: 5px 5px 3px 0;
  padding: 3px 20px 2px 5px;
  border-radius: var(--radius-filter-control);
  background-color: var(--color-filter-chip-bg);
  color: var(--color-filter-control-text);
  line-height: 13px;
}

.remove {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: 3px;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-filter-chip-remove);
  font-size: 10px;
  line-height: 1;
  translate: 0 -50%;

  &:hover {
    color: var(--color-filter-control-text);
  }
}

/* Scoped under .field to outrank base.css's form-control styles. */
.field input {
  flex: 1;
  min-inline-size: 25px;
  min-block-size: 25px;
  margin: 1px 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  box-shadow: none;
  color: var(--color-filter-control-text);
  font-family: sans-serif;
  font-size: var(--font-size-filter-control);

  &:focus {
    box-shadow: none;
  }

  &:focus-visible {
    outline: 0;
  }

  &::placeholder {
    color: var(--color-filter-control-text);
  }

  .chip ~ &::placeholder {
    color: var(--color-input-placeholder);
  }
}

.drop {
  position: absolute;
  inset-block-start: 100%;
  inset-inline: 0;
  z-index: 2;
  max-block-size: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  background-color: var(--color-filter-control-bg);
  color: var(--color-filter-control-text);
  list-style: none;

  &[hidden] {
    display: none;
  }
}

li {
  padding: 6px 8px;
  line-height: 15px;
  overflow-wrap: anywhere;
  cursor: pointer;

  &.grouped {
    padding-inline-start: 15px;
  }

  &[aria-selected='true'] {
    color: var(--color-filter-option-picked);
  }

  &.highlighted {
    background-color: var(--color-filter-option-highlight);
    color: var(--color-filter-option-highlight-text);
  }
}

.group-label {
  font-weight: bold;
  cursor: default;
}

.note {
  cursor: default;
}

.tag {
  float: inline-end;
  margin-inline-start: 4px;
  padding: 2px 4px 3px;
  border-radius: var(--radius-filter-control);
  background-color: var(--color-filter-option-tag-bg);
  color: var(--color-filter-option-tag);
  font-size: 11px;
  line-height: 1;

  .highlighted & {
    background-color: var(--color-filter-control-bg);
  }
}
</style>
