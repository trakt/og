<!--
  The flush fanart grid inside a Frame: the first two cards are wide, two
  a row, then three a row, four on the widest screens, each with OG's 1px separators on the right and bottom.
  OG switched columns at the 768, 992 and 1600px viewport breakpoints. Minus the 300px sidebar, that's a frame of
  468, 692 and 1300px, so the container queries use those.
  The other variants are the search grids, none with wide cards. `poster` is
  the default image type: two a row, then four, six from a 1200px viewport and twelve from 2000px. `uniform` is the
  fanart columns, for the Users tab and the thumb, screenshot, fanart and logo image types. `banner` is one a row, two
  from a 992px viewport and three from 1600px.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

const { children, variant = 'fanart' }: { children: Snippet; variant?: 'fanart' | 'poster' | 'uniform' | 'banner' } =
  $props();
</script>

<div class="frame-grid-frame">
  <div class={['frame-grid', variant]}>
    {@render children()}
  </div>
</div>

<style>
.frame-grid-frame {
  container-type: inline-size;
}

.frame-grid {
  --span: 12;
  --span-wide: 12;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));

  & > :global(*) {
    grid-column: span var(--span);
    border-block-end: 1px solid var(--color-frame-border);
    border-inline-end: 1px solid var(--color-frame-border);
  }

  & > :global(:nth-child(-n + 2)) {
    grid-column: span var(--span-wide);
  }
}

@container (width >= 468px) {
  .frame-grid {
    --span: 6;
    --span-wide: 6;
  }
}

@container (width >= 692px) {
  .frame-grid {
    --span: 4;
  }
}

@container (width >= 1300px) {
  .frame-grid {
    --span: 3;
  }
}

/* OG's col-sm-6 col-md-4 col-xlg-3: the fanart columns, every card the same width. */
.frame-grid.uniform {
  --span-wide: var(--span);
}

/* OG's col-md-6 col-xlg-4, as frame widths. */
.frame-grid.banner {
  --span: 12;
  --span-wide: var(--span);
}

@container (width >= 692px) {
  .frame-grid.banner {
    --span: 6;
  }
}

@container (width >= 1300px) {
  .frame-grid.banner {
    --span: 4;
  }
}

/* OG's col-xs-6 col-sm-3 col-md-3 col-lg-2 col-xlg-2 col-xxlg-1, as frame widths. */
.frame-grid.poster {
  --span: 6;
  --span-wide: var(--span);
}

@container (width >= 468px) {
  .frame-grid.poster {
    --span: 3;
  }
}

@container (width >= 900px) {
  .frame-grid.poster {
    --span: 2;
  }
}

@container (width >= 1700px) {
  .frame-grid.poster {
    --span: 1;
  }
}
</style>
