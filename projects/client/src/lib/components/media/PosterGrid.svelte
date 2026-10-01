<!--
  OG's `.posters` / `.fanarts` row: equal columns with a 20px gutter. Six poster cards a row at desktop width, five on
  show pages, three or four fanart cards. Narrow containers drop to four columns, then two, like OG's col-sm and col-xs.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  /** Columns at desktop width. */
  columns?: number;
  /** No gutter, like the fanart grids on the chart pages. */
  flush?: boolean;
  /** Columns below OG's sm width: two, or one for fanart cards that were `col-xs-12` there. */
  phoneColumns?: number;
  children: Snippet;
}

const { columns = 6, flush = false, phoneColumns = 2, children }: Props = $props();
</script>

<div class="poster-grid-frame">
  <div class={['poster-grid', { flush }]} style:--columns={columns} style:--phone-columns={phoneColumns}>
    {@render children()}
  </div>
</div>

<style>
.poster-grid-frame {
  container-type: inline-size;
  margin-block-end: var(--gutter);
}

.poster-grid {
  --visible: var(--columns);
  display: grid;
  grid-template-columns: repeat(var(--visible), minmax(0, 1fr));
  gap: var(--gutter);
  /* OG gave every card a 20px top margin, which also leaves room for rank pills and badges above the first row. */
  padding-block-start: var(--gutter);

  &.flush {
    gap: 0;
  }
}

/* col-sm-3 below OG's md container, col-xs-6 below sm. */
@container (width < 940px) {
  .poster-grid {
    --visible: min(var(--columns), 4);
  }
}

@container (width < 720px) {
  .poster-grid {
    --visible: min(var(--columns), var(--phone-columns));
  }
}
</style>
