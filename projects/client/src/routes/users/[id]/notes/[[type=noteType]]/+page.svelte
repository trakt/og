<script lang="ts">
import NotesPage from '$lib/users/notes/NotesPage.svelte';
const { data } = $props();
</script>

<NotesPage {data} />
