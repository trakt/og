<script lang="ts">
import ItemListsPage from '$lib/itemLists/ItemListsPage.svelte';

const { data } = $props();
</script>

<ItemListsPage {data} />
