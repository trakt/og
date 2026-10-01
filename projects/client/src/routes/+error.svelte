<!--
  A plain error page inside the shell, on OG's white section like any page body. OG's standalone 404 and 500 pages
  aren't cloned yet.
-->
<script lang="ts">
import { page } from '$app/state';
import Container from '$lib/components/container/Container.svelte';
</script>

<svelte:head>
  <title>{page.status === 404 ? 'Page Not Found (404)' : `Error (${page.status})`} - Trakt</title>
</svelte:head>

<section>
  <Container>
    <h1>{page.status}</h1>
    <p>{page.error?.message}</p>
  </Container>
</section>

<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
</style>
