<script lang="ts">
import RatingsPage from '$lib/users/ratings/RatingsPage.svelte';
const { data } = $props();
</script>
<RatingsPage {data} />
