<script lang="ts">
import CommentPage from '$lib/comments/CommentPage.svelte';

const { data } = $props();
</script>

<CommentPage {data} />
