<script lang="ts">
import PersonPage from '$lib/people/PersonPage.svelte';

const { data } = $props();
</script>

<PersonPage {data} />
