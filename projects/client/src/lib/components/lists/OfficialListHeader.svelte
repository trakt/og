<script lang="ts">
import logo from '$lib/assets/trakt-logo-red.png';
import Container from '$lib/components/container/Container.svelte';
const { image }: { image?: string } = $props();
</script>

<section class="official-cover" style:background-image={image ? `url("${image}")` : undefined}
  aria-label="Official Trakt list">
  <div class="shadow"></div>
  <Container>
    <div class="identity">
      <img src={logo} alt="" class="avatar" width="72" height="72" />
      <div>
        <h1>Trakt</h1>
        <p>Official List</p>
      </div>
    </div>
  </Container>
</section>

<style>
.official-cover {
  position: relative;
  block-size: calc(var(--official-list-cover-height) + var(--header-height));
  overflow: hidden;
  background-color: var(--color-header-bg);
  background-position: 50% 20%;
  background-size: cover;
  color: var(--color-text-inverse);
}
.shadow {
  position: absolute;
  inset: 0;
  background: var(--gradient-profile-shadow);
}
.identity {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-panel);
  margin-block-start: calc(var(--profile-avatar-top-slim) + var(--header-height));
  text-shadow: var(--text-shadow-headings);
}
.avatar {
  inline-size: var(--profile-avatar-size-slim);
  block-size: var(--profile-avatar-size-slim);
  border: var(--official-list-avatar-border) solid var(--color-text-inverse);
  border-radius: 50%;
  background-color: var(--color-text-inverse);
  object-fit: cover;
}
h1 {
  margin: 0;
  padding-block-start: var(--space-base-block);
}
p {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-profile-meta);
  line-height: var(--line-height-headings);
}
</style>
