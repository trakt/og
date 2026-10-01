<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import { returnPath } from '$lib/auth/returnPath';
import { storeToken } from '$lib/auth/storeToken';
import { userManager } from '$lib/auth/userManager';
import { onMount } from 'svelte';

type ReturnState = { returnTo?: unknown } | undefined;

onMount(async () => {
  const user = await userManager().signinCallback().catch(() => undefined);
  if (user) await storeToken(user).catch(() => {});

  // replace, not goto: the ?code= URL must not stay in history, and a full load renders the signed-in SSR.
  location.replace(returnPath((user?.state as ReturnState)?.returnTo));
});
</script>

<svelte:head>
  <title>Signing in - Trakt</title>
</svelte:head>

<section>
  <Container>
    <p>Signing in…</p>
  </Container>
</section>

<style>
section {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
</style>
