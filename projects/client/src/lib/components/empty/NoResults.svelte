<!--
  OG's empty grid on the dark charts and search frames: the faded hooded
  figure over "These aren't the droids you're looking for."
-->
<script lang="ts">
import hooded from '$lib/assets/no-results-hooded.png';
</script>

<div class="no-results">
  <img src={hooded} alt="" />
  <p>These aren't the droids<br />you're looking for.</p>
</div>

<style>
.no-results {
  padding-block: var(--no-results-padding);
  color: var(--color-no-results-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-no-results);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);
  text-align: center;
}

img {
  display: block;
  inline-size: var(--no-results-image);
  margin: 0 auto var(--gutter);
  opacity: 0.5;
}

p {
  margin: 0;
}
</style>
