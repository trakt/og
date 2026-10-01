<script lang="ts">
import ItemCommentsPage from '$lib/comments/ItemCommentsPage.svelte';

const { data } = $props();
</script>

<ItemCommentsPage {data} />
