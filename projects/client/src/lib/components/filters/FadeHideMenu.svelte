<!--
  OG's fade and hide eye: "Show All", then the FADE and HIDE toggles. Each
  section is kept in a year-long cookie, `filter-fade-<cookie>` and `filter-hide-<cookie>`, so SSR renders the same.
-->
<script lang="ts" generics="Option extends string">
import FilterMenu from '$lib/components/filters/FilterMenu.svelte';
import FadeHideItems from '$lib/components/filters/FadeHideItems.svelte';

interface Props {
  value: { fade: readonly Option[]; hide: readonly Option[] };
  options: readonly { id: Option; label: string }[];
  /** Defaults to the fade options; an empty list omits Hide (mixed and ID searches). */
  hideOptions?: readonly { id: Option; label: string }[];
  /** The cookie suffix: `shows`, `movies`, `calendars`, `search`. */
  cookie: string;
  /** `default` is the thin eye in a section toolbar. */
  variant?: 'default' | 'frame';
  onchange: (next: { fade: Option[]; hide: Option[] }) => void;
}

const { value, options, hideOptions = options, cookie, variant = 'frame', onchange }: Props = $props();

const count = $derived(value.fade.length + value.hide.length);

function save(next: { fade: Option[]; hide: Option[] }, clear = false) {
  for (const section of ['fade', 'hide'] as const) {
    const list = next[section].join(',');
    // Changing Fade on a tab without Hide must not erase that section's saved Hide preference.
    if (!clear && list === value[section].join(',')) continue;
    document.cookie = `filter-${section}-${cookie}=${list}; path=/; samesite=lax; max-age=${list ? 31_536_000 : 0}`;
  }
  onchange(next);
}
</script>

<FilterMenu active={count > 0} {count} {variant}>
  <FadeHideItems {value} fadeOptions={options} {hideOptions} onchange={save}
    onreset={() => save({ fade: [], hide: [] }, true)} />
</FilterMenu>
