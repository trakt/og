<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import { page } from '$app/state';
import { login } from '$lib/auth/login';
import { returnPath } from '$lib/auth/returnPath';
import { onMount } from 'svelte';

// OG's sign-in URL. Links pass `?redirect_to=/some/path` to come back to that page.
onMount(() => login(returnPath(page.url.searchParams.get('redirect_to'))));
</script>

<svelte:head>
  <title>Sign in - Trakt</title>
</svelte:head>

<section>
  <Container>
    <p>Redirecting to Trakt sign in…</p>
  </Container>
</section>

<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
</style>
