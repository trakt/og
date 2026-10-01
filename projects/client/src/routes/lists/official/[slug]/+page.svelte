<script lang="ts">
import ListPage from '$lib/lists/ListPage.svelte';
const { data } = $props();
</script>
<ListPage {data} />
