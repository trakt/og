<script lang="ts">
import ProfilePage from '$lib/users/profile/ProfilePage.svelte';

const { data } = $props();
</script>

<ProfilePage {data} />
