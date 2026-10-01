<script lang="ts">
import HiddenPage from '$lib/users/hidden/HiddenPage.svelte';
import poster from '$lib/assets/placeholders/poster.png';
const data = {
  type: 'watched' as const,
  expired: false,
  user: { slug: 'demo', firstName: 'Demo', avatarUrl: '', isVip: true },
  items: [{
    key: 'show:1',
    id: 1,
    type: 'show' as const,
    title: 'Example show',
    parentTitle: undefined,
    sortTitle: 'example show',
    image: poster,
    date: 'Sep 27, 2026 5:00 AM',
    hiddenAt: '2026-09-27T12:00:00Z',
  }, {
    key: 'season:2',
    id: 2,
    type: 'season' as const,
    title: 'Season 1',
    parentTitle: 'Example show',
    sortTitle: 'example show 1',
    image: poster,
    date: 'Sep 27, 2026 5:00 AM',
    hiddenAt: '2026-09-27T12:00:00Z',
  }, {
    key: 'user:reader',
    id: 'reader',
    type: 'user' as const,
    title: 'Example author',
    parentTitle: undefined,
    sortTitle: 'example author',
    image: undefined,
    date: 'Sep 27, 2026 5:00 AM',
    hiddenAt: '2026-09-27T12:00:00Z',
  }],
};
</script>
<HiddenPage {data} />
