<!-- OG's `.rank-wrapper`: a numbered pill centred over the top edge of the nearest positioned ancestor. -->
<script lang="ts">
interface Props {
  rank: number;
}

const { rank }: Props = $props();
</script>

<p class="rank">{rank}</p>

<style>
.rank {
  position: absolute;
  inset-block-start: -11px;
  inset-inline-start: 50%;
  z-index: 20;
  translate: -50% 0;
  min-inline-size: 22px;
  block-size: 22px;
  margin: 0;
  padding: 0 5px;
  border: 2px solid var(--color-rank-border);
  border-radius: 11px;
  background-color: var(--gray-dark);
  color: var(--color-card-text);
  font-size: var(--font-size-card-tag);
  font-weight: bold;
  line-height: 1.6;
  text-align: center;
}
</style>
