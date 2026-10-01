<!--
  The profile frame in every state, on sample data: covers, labels, follow states, the request banner and the
  watching-now bar. Real profiles only show the states the signed-in viewer is actually in. Under it, the profile
  page's stat boxes (filled and empty), a favorite card, the welcome hero, the charts, the most watched columns (OG's
  defaults, then a saved sort and tab), and the network page's user cards in each follow state.
-->
<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import FavoriteCard from '$lib/components/users/FavoriteCard.svelte';
import MostWatched from '$lib/components/users/MostWatched.svelte';
import ProfileCharts from '$lib/components/users/ProfileCharts.svelte';
import ProfileFrame from '$lib/components/users/ProfileFrame.svelte';
import ProfileStatBoxes from '$lib/components/users/ProfileStatBoxes.svelte';
import UserCard from '$lib/components/users/UserCard.svelte';
import WelcomeHero from '$lib/components/users/WelcomeHero.svelte';
import { profileTabs } from '$lib/users/profileTabs';
import { toGenreBar } from '$lib/users/profile/toGenreBar';
import { toRatingsChart } from '$lib/users/profile/toRatingsChart';
import type { ProfileUser } from '$lib/users/ProfileUser';
import type { ViewerRelation } from '$lib/users/ViewerRelation';
import type { WatchingNow } from '$lib/users/WatchingNow';

const vip: ProfileUser = {
  slug: 'leela',
  username: 'leela',
  displayName: 'Turanga Leela',
  firstName: 'Turanga',
  avatarUrl: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/leela.png',
  isPrivate: true,
  isLocked: false,
  vip: { kind: 'vip', tag: { text: 'OG', title: 'Original VIP Member' }, years: 15 },
  location: 'Planet Express',
  gender: { icon: 'venus', title: 'Female' },
  age: 28,
  coverUrl: 'https://media.trakt.tv/images/shows/000/099/080/fanarts/full/a049f455c1.jpg',
  about: null,
};

const free: ProfileUser = {
  ...vip,
  slug: 'bender',
  username: 'bender',
  displayName: 'bender',
  firstName: 'bender',
  avatarUrl: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
  isPrivate: false,
  vip: { kind: 'vip', tag: { text: 'EP', title: 'Executive Producer' }, years: null },
  location: 'Omicron Persei 8',
  gender: { icon: 'genderless', title: 'Unknown' },
  age: null,
  coverUrl: null,
};

const watching: WatchingNow = {
  action: 'checkin',
  title: 'The Boys',
  episode: { number: '1x05', title: 'Good for the Soul' },
  href: '/shows/the-boys-2019/seasons/1/episodes/5',
  fanartUrl: null,
  endsAt: new Date(Date.now() + 25 * 60_000).toISOString(),
  runtime: 60,
};

const relation = (value: Partial<ViewerRelation>) =>
  Promise.resolve({ follow: 'none', followsYou: false, blocked: false, requestId: null, ...value } as const);

const counts = { followers: 12_468, following: 1 };
const tabs = (slug: string, section = '') => profileTabs({ slug, pathname: `/users/${slug}/${section}`, isSelf: true });

const states = [
  {
    title: 'Tall cover, their request, following each other',
    props: { user: vip, large: true, relation: relation({ follow: 'following', followsYou: true, requestId: 1 }) },
  },
  {
    title: 'Tall cover, watching now',
    props: { user: vip, large: true, watching, relation: relation({ follow: 'pending' }) },
  },
  {
    title: 'Slim cover (subpage), pending',
    props: { user: vip, tab: 'history', relation: relation({ follow: 'pending' }) },
  },
  { title: 'Default cover, blocked', props: { user: free, large: true, relation: relation({ blocked: true }) } },
  { title: 'Slim, watching, your own profile', props: { user: free, tab: 'network', watching, isSelf: true } },
  { title: 'Signed out', props: { user: free, large: true, signedIn: false } },
  { title: 'Follow permission disabled', props: { user: free, large: true, canFollow: false, relation: relation({}) } },
  {
    title: 'Incoming request from someone who does not follow you yet',
    props: { user: { ...free, slug: 'requester' }, relation: relation({ requestId: 2 }) },
  },
];

const totals = { episodes: { minutes: 2_820, unique: 46 }, movies: { minutes: 1_070, unique: 7 } };
const about = 'Huge **TV** nerd.\n\nSecond paragraph.';
const none = { episodes: { minutes: 0, unique: 0 }, movies: { minutes: 0, unique: 0 } };
const genreNames = ['Drama', 'Action', 'Comedy', 'Thriller', 'Science fiction', 'Crime', 'Adventure', 'Fantasy'];
const genres = genreNames.map((name, i) =>
  toGenreBar({
    play_count: 100 - i * 10,
    genre: { slug: name.toLowerCase().replace(' ', '-'), name },
    percentage: 20 - i * 2,
    percentage_row: 100 - i * 10,
    episodes: { play_count: 0, ids: [] },
    shows: { play_count: 40 - i * 4, ids: Array.from({ length: 40 - i * 4 }, (_, n) => n) },
    movies: { play_count: 60 - i * 5, ids: Array.from({ length: 50 - i * 5 }, (_, n) => n) },
  }, { slug: 'leela' })
);
const ratings = toRatingsChart({
  '1': 8,
  '2': 2,
  '3': 4,
  '4': 6,
  '5': 14,
  '6': 14,
  '7': 17,
  '8': 43,
  '9': 48,
  '10': 105,
});
const card = (id: number, title: string, time: string, plays: string) =>
  ({ type: 'show', id, href: '/shows/the-boys-2019', title, time, plays }) as const;
const mostWatched = {
  shows: {
    lastMonth: [card(1, 'The Boys', '18h 26m', '21 plays'), card(2, 'Futurama', '12h 47m', '16 plays')],
    allTime: [card(3, 'Futurama', '3d 4h 12m', '140 plays')],
    sortBy: 'plays',
    tab: 'lastMonth',
  },
  movies: { lastMonth: [], allTime: [], sortBy: 'time', tab: 'lastMonth' },
} as const;
// Your saved settings: shows by time watched on All Time, movies by plays.
const savedMostWatched = {
  shows: { ...mostWatched.shows, sortBy: 'time', tab: 'allTime' },
  movies: { ...mostWatched.movies, sortBy: 'plays' },
} as const;
const fanart = 'https://media.trakt.tv/images/movies/000/475/091/fanarts/thumb/f9564152dc.jpg.webp';
const cardRelation = (value: Partial<ViewerRelation>): ViewerRelation => ({
  follow: 'none',
  followsYou: false,
  blocked: false,
  requestId: null,
  ...value,
});
const cards = [
  { key: 'follow', user: free, relation: cardRelation({}) },
  {
    key: 'friends',
    user: { ...vip, isPrivate: false },
    relation: cardRelation({ follow: 'following', followsYou: true }),
  },
  { key: 'pending', user: vip, relation: cardRelation({ follow: 'pending' }) },
  {
    key: 'follows-you',
    user: { ...free, slug: 'fry', displayName: 'Philip J. Fry', vip: null },
    relation: cardRelation({ followsYou: true }),
  },
  { key: 'self', user: { ...free, slug: 'self', displayName: 'You (or signed out)' }, relation: null },
];
</script>

<svelte:head>
  <title>Profile frame: og</title>
</svelte:head>

{#each states as { title, props } (title)}
  <h2 class="state">{title}</h2>
  <ProfileFrame
  user={props.user}
  counts={counts}
  watching={props.watching ?? null}
  tabs={tabs(props.user.slug, props.tab)}
  large={props.large}
  isSelf={props.isSelf ?? false}
  signedIn={props.signedIn ?? true}
  canFollow={props.canFollow ?? true}
  relation={props.relation ?? null}
/>
{/each}

<h2 class="state">Stat boxes</h2>
<ProfileStatBoxes
  {about}
  lastWatched={{
    image: fanart,
    title: { text: 'The Boys', href: '/shows/the-boys-2019' },
    episode: { text: '2x01 The Big Ride', href: '/shows/the-boys-2019/seasons/2/episodes/1' },
  }}
  recent={totals}
  allTime={totals}
  featured={{ name: 'Watchlist', href: '/users/leela/watchlist', empty: false, image: fanart }}
/>

<h2 class="state">Stat boxes, nothing watched yet</h2>
<ProfileStatBoxes
  about={null}
  lastWatched={null}
  recent={none}
  allTime={none}
  featured={{ name: 'Watchlist', href: '/users/leela/watchlist', empty: true }}
/>

<h2 class="state">Favorite card</h2>
<Container>
  <div class="favorite">
    <FavoriteCard
      favorite={{
        type: 'show',
        id: 1,
        href: '/shows/the-boys-2019',
        title: 'The Boys',
        typeLabel: 'Show',
        year: 2019,
        gradient: ['#FBB91E', '#A74B2B'],
        notes: 'Rewatch every year.',
      }}
    />
  </div>
</Container>

<h2 class="state">Welcome hero</h2>
<WelcomeHero />

<h2 class="state">Charts</h2>
<ProfileCharts {genres} {ratings} slug="leela" />

<h2 class="state">Charts, no ratings</h2>
<ProfileCharts genres={genres.slice(0, 3)} ratings={toRatingsChart({})} slug="leela" />

<h2 class="state">Most watched, your own profile</h2>
<MostWatched
  {...mostWatched}
  slug="leela"
  windowStart="2026-08-30T00:00:00.000Z"
  isSelf
  hasnt={(rest) => `You haven't ${rest}`}
  datePreferences={{ order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 }}
/>

<h2 class="state">Most watched, your saved sort and default tab (shows on All Time by time watched)</h2>
<MostWatched
  {...savedMostWatched}
  slug="leela"
  windowStart="2026-08-30T00:00:00.000Z"
  isSelf
  hasnt={(rest) => `You haven't ${rest}`}
  datePreferences={{ order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 }}
/>

<h2 class="state">User cards: follow, friends, pending and private, follows you, yourself or signed out</h2>
<Container>
  <ul class="user-cards">
    {#each cards as card (card.key)}<li><UserCard user={card.user} relation={card.relation} /></li>{/each}
  </ul>
</Container>

<style>
.user-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gutter);
  margin: 0;
  padding: var(--gutter) 0;
  list-style: none;
}

.favorite {
  inline-size: calc(100% / 3);
  background-color: var(--color-favorites-bg);
  padding-block: var(--gutter);
}

.state {
  margin: 0;
  padding: var(--space-lg-block) var(--gutter);
  background-color: var(--color-surface);
  font-size: var(--font-size-h4);
}
</style>
