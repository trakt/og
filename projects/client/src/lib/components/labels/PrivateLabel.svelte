<!--
  OG's Private label: a gray tag after the name of a private account.
  `smaller` is OG's `.label-private.smaller`, the small tag after a name on a user card.
-->
<script lang="ts">
const { smaller = false }: { smaller?: boolean } = $props();
</script>

<span class={['label-private', { smaller }]}>Private</span>

<style>
.label-private {
  position: relative;
  display: inline-block;
  margin: 0 0 5px 10px;
  padding: 5px 7px;
  background-color: var(--color-label-private);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-headings);
  line-height: 1;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-shadow: none;
  vertical-align: middle;
}

/* `.label-private.smaller` */
.smaller {
  margin: -3px 0 0 5px;
  padding: 2px 4px;
  border-radius: var(--radius-label-small);
  font-size: var(--font-size-pill);
  letter-spacing: 0;
}
</style>
