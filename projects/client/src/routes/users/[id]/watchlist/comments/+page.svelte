<script lang="ts">
import ListCommentsPage from '$lib/lists/comments/ListCommentsPage.svelte';
const { data } = $props();
</script>
<ListCommentsPage {data} />
