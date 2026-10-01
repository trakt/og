<script lang="ts">
import logo from '$lib/assets/trakt-wide-red-white.svg';
</script>

<svelte:head>
  <title>Trakt OG: coming soon</title>
</svelte:head>

<main>
  <h1><img src={logo} alt="Trakt" width="289" height="98" /></h1>
  <p>Coming soon</p>
</main>

<style>
:global(html) {
  color-scheme: dark;
}

:global(body) {
  margin: 0;
  background: #0a0a0a;
}

main {
  --red: #ed1c24;
  position: relative;
  overflow: hidden;
  min-block-size: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: clamp(1.5rem, 4vw, 3rem);
  padding: 2rem;
  font-family: 'proxima-nova', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  text-align: center;
  isolation: isolate;
}

/* The spotlight: a soft pool of light behind the logo that drifts slowly. */
main::before {
  content: '';
  position: absolute;
  inset: -20%;
  z-index: -1;
  background:
    radial-gradient(ellipse 45% 35% at 50% 45%, rgb(255 255 255 / 0.09), transparent 70%),
    radial-gradient(ellipse 60% 45% at 50% 50%, rgb(237 28 36 / 0.07), transparent 75%);
  animation: drift 18s ease-in-out infinite alternate;
}

h1 {
  margin: 0;
}

img {
  display: block;
  inline-size: min(80vw, 900px);
  block-size: auto;
  animation: glow 6s ease-in-out infinite;
}

p {
  margin: 0;
  font-size: clamp(0.875rem, 1.6vw, 1.25rem);
  font-weight: 600;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
  /* letter-spacing trails the last letter; pull it back so the text stays centered */
  margin-inline-end: -0.5em;
}

@keyframes glow {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgb(237 28 36 / 0.15)) drop-shadow(0 0 40px rgb(237 28 36 / 0.1));
  }
  50% {
    filter: drop-shadow(0 0 20px rgb(237 28 36 / 0.35)) drop-shadow(0 0 80px rgb(237 28 36 / 0.2));
  }
}

@keyframes drift {
  from {
    transform: translate3d(-2%, -1%, 0) scale(1);
  }
  to {
    transform: translate3d(2%, 1%, 0) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  main::before,
  img {
    animation: none;
  }
  img {
    filter: drop-shadow(0 0 20px rgb(237 28 36 / 0.25));
  }
}
</style>
