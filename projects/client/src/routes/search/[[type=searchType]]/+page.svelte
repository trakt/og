<script lang="ts">
import SearchPage from '$lib/search/SearchPage.svelte';

const { data } = $props();
</script>

<SearchPage {data} />
