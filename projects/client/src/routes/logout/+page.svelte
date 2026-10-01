<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import { logout } from '$lib/auth/logout';
import { onMount } from 'svelte';

// OG's sign-out URL.
onMount(logout);
</script>

<svelte:head>
  <title>Sign out - Trakt</title>
</svelte:head>

<section>
  <Container>
    <p>Signing out…</p>
  </Container>
</section>

<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
</style>
