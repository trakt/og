<script lang="ts">
import ListsPage from '$lib/users/lists/ListsPage.svelte';
const { data } = $props();
</script>

<ListsPage {data} />
