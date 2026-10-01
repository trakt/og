<script lang="ts">
import HistoryPage from '$lib/users/history/HistoryPage.svelte';
const { data } = $props();
</script>

<HistoryPage {data} />
