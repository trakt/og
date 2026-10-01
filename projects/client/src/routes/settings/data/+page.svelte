<script lang="ts">
import SyncsPage from '$lib/settings/syncs/SyncsPage.svelte';
const { data } = $props();
</script>
<SyncsPage {data} scope="import" />
