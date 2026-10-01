<!--
  OG's genre bars (`.genre-bars.light`, users.js:370-414): one colored bar a genre, as wide as its share of the plays,
  with its name and counts hanging above or below it in turn. Hovering the chart dims every other bar and shows the
  percentages. Too many to fit scroll sideways. Below phone width they stack as rows, each as wide as its share of
  the top genre, with the counts on one line.
-->
<script lang="ts">
import type { GenreBar } from '$lib/users/profile/toGenreBar';

const { genres }: { genres: readonly GenreBar[] } = $props();
</script>

<!-- The history page and its genre filter aren't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<ol class="genre-bars">
  {#each genres as genre (genre.slug)}
    <li class="bar" style:--width="{genre.percentage}%" style:--width-row="{genre.percentageRow}%">
      <span class="percentage">{genre.percentageText}</span>
      <span class="label">{genre.name}<span class="count">
          {#each genre.counts as count, i (count.href)}{#if i > 0}<span class="comma">,&nbsp;</span>{/if}<a href={count.href}>{count.text}</a>{/each}
        </span></span>
    </li>
  {/each}
</ol>

<style>
.genre-bars {
  display: flex;
  margin: 0;
  padding: var(--genre-bars-padding);
  overflow-x: auto;
  overflow-y: hidden;
  list-style: none;
  scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
  scrollbar-width: thin;
}

.bar {
  --genre-color: var(--color-genre-1);
  position: relative;
  inline-size: var(--width);
  min-inline-size: var(--genre-bar-min-width);
  block-size: var(--genre-bar-height);
  margin-inline-start: var(--genre-bar-gap);
  background-color: var(--genre-color);
  transition: opacity var(--transition-chart);

  &:first-child {
    margin-inline-start: 0;
  }

  /* OG's eleven colors, round and round. */
  &:nth-child(11n + 2) {
    --genre-color: var(--color-genre-2);
  }
  &:nth-child(11n + 3) {
    --genre-color: var(--color-genre-3);
  }
  &:nth-child(11n + 4) {
    --genre-color: var(--color-genre-4);
  }
  &:nth-child(11n + 5) {
    --genre-color: var(--color-genre-5);
  }
  &:nth-child(11n + 6) {
    --genre-color: var(--color-genre-6);
  }
  &:nth-child(11n + 7) {
    --genre-color: var(--color-genre-7);
  }
  &:nth-child(11n + 8) {
    --genre-color: var(--color-genre-8);
  }
  &:nth-child(11n + 9) {
    --genre-color: var(--color-genre-9);
  }
  &:nth-child(11n + 10) {
    --genre-color: var(--color-genre-10);
  }
  &:nth-child(11n) {
    --genre-color: var(--color-genre-11);
  }

  /* Keyboard focus on a count does what the mouse does. */
  .genre-bars:is(:hover, :focus-within) & {
    opacity: var(--opacity-genre-dimmed);
  }

  .genre-bars &:is(:hover, :focus-within) {
    opacity: 1;
  }
}

.percentage {
  position: absolute;
  inset-block-start: var(--genre-percentage-top);
  inset-inline-start: 0;
  inline-size: 100%;
  color: var(--color-genre-percentage);
  font-family: var(--font-headings);
  font-size: var(--font-size-genre-label);
  font-weight: var(--font-weight-headings-light);
  text-align: center;
  opacity: 0;
  transition: opacity var(--transition-chart);

  .genre-bars:is(:hover, :focus-within) & {
    opacity: 1;
  }
}

.label {
  position: absolute;
  inset-block-end: var(--genre-bar-height);
  inset-inline-start: 0;
  padding: var(--genre-label-padding);
  border-inline-start: 1px solid var(--genre-color);
  color: var(--color-genre-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-genre-label);
  font-weight: var(--font-weight-headings);
  line-height: 1;
  text-transform: uppercase;
  transition: color var(--transition-chart);

  .bar:nth-child(2n) & {
    inset-block: var(--genre-bar-height) auto;
    padding: var(--genre-label-padding-below);
  }

  .bar:is(:hover, :focus-within) & {
    color: var(--color-genre-label-hover);
  }
}

.count {
  display: block;
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-genre-count);
  white-space: nowrap;

  & a {
    display: block;
    color: var(--color-genre-count);
    text-decoration: none;
    transition: color var(--transition-chart);

    .bar:is(:hover, :focus-within) & {
      color: var(--color-genre-count-hover);
    }

    &:is(:hover, :focus-visible) {
      color: var(--color-genre-count-link-hover);
    }
  }
}

/* The phone rows join the counts on one line. */
.comma {
  display: none;
  color: var(--color-genre-count);
}

/* OG's `.genre-bars.rows.less-top`, visible-xs. */
@media (max-width: 767px) {
  .genre-bars {
    display: block;
    padding-block-start: 0;
  }

  .bar {
    inline-size: var(--width-row);
    margin: var(--genre-row-gap) 0 0;

    &:first-child {
      margin-block-start: var(--genre-row-gap);
    }
  }

  .label,
  .bar:nth-child(2n) .label {
    inset-block: auto var(--genre-bar-height);
    padding: var(--genre-label-padding);
    white-space: nowrap;
  }

  .count a,
  .comma {
    display: inline;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar,
  .percentage,
  .label,
  .count a {
    transition: none;
  }
}
</style>
