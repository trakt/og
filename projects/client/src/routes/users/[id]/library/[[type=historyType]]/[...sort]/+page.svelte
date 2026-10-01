<script lang="ts">
import LibraryPage from '$lib/users/library/LibraryPage.svelte';
const { data } = $props();
</script>

<LibraryPage {data} />
