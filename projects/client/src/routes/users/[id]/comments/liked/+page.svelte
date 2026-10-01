<script lang="ts">
import UserCommentsPage from '$lib/users/comments/UserCommentsPage.svelte';
const { data } = $props();
</script>

<UserCommentsPage {data} />
