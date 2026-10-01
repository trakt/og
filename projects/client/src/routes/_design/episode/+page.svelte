<script lang="ts">
import ItemStatIcons from '$lib/components/media/ItemStatIcons.svelte';
import Container from '$lib/components/container/Container.svelte';
import FanartHeader from '$lib/components/media/FanartHeader.svelte';
import EpisodeTitle from '$lib/components/summary/EpisodeTitle.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import SpoilerContent from '$lib/components/summary/SpoilerContent.svelte';
</script>
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>Episode summary components - Trakt</title>
</svelte:head>
<FanartHeader>
  <EpisodeTitle show={{title:'Breaking Bad',href:'/shows/breaking-bad'}}
    season={{title:'Season 1',href:'/shows/breaking-bad/seasons/1'}} number="1x01" title="Pilot" year={2008}
    certification="TV-MA" type={{text:'Series Premiere',kind:'series-premiere'}} />
</FanartHeader>
<Container>
  <h2>Community stat icons</h2>
  <ItemStatIcons href="/shows/breaking-bad/seasons/1/episodes/1"
    stats={{ watchers: 4321, plays: 5678, collectors: 1234, lists: 987 }} comments={23} />
  <h3>Reserved while loading</h3>
  <ItemStatIcons href="/shows/breaking-bad/seasons/1/episodes/1" />
  <h2>Episode overview</h2>
  <SpoilerContent hidden={true}>
    <Overview overview="An unexpected visitor forces everyone to rethink their plans." />
  </SpoilerContent>
  <h2>Inline spoilers</h2>
  <h3><strong>1x01</strong> <SpoilerContent hidden inline>Pilot</SpoilerContent></h3>
  <SpoilerContent hidden
    inline><a href="/shows/breaking-bad/seasons/1/episodes/1/stats">82% · 1,600 votes</a></SpoilerContent>
</Container>
