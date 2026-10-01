<script lang="ts">
import HiddenPage from '$lib/users/hidden/HiddenPage.svelte';
const { data } = $props();
</script>
<HiddenPage {data} />
