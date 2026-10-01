<!--
  The Trakt loading mark: red rises in a wave behind the white monogram until the disc is full, then drains, inside the
  classic outer ring. Geometry comes from the round mark in `$lib/assets/trakt-wide-red-white.svg`. Reduced motion (or
  `reducedMotion`) swaps the wave for a slow breathe of the full mark. static/loader.svg is the same mark for places
  outside Svelte; keep the two in step.
-->
<script lang="ts">
const { size = 64, label = 'Loading', reducedMotion = false }: {
  size?: number;
  label?: string;
  /** Force the reduced-motion look, whatever the visitor's setting. */
  reducedMotion?: boolean;
} = $props();

// One clip per instance, so two loaders on a page never share an id.
const uid = $props.id();
const clip = `trakt-loader-${uid}`;
</script>

<span class="loader" role="status">
  <svg
    width={size}
    height={size}
    viewBox="0 0 98.1 98.1"
    aria-hidden="true"
    data-motion={reducedMotion ? 'reduce' : undefined}
    class={{ small: size < 24 }}
  >
    <defs>
      <clipPath id={clip}>
        <circle cx="49.1" cy="49.1" r="39.5" />
      </clipPath>
    </defs>
    <circle class="ring" cx="49.1" cy="49.1" r="46.6" />
    <circle class="empty" cx="49.1" cy="49.1" r="39.5" />
    <g clip-path="url(#{clip})">
      <g class="tide">
        <path class="wave" d="M-40,4 q10,-6 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 V200 H-40z" />
      </g>
    </g>
    <g class="stripes">
      <path
        d="M38.2,52.1L17.5,72.8c0.8,1.1,1.6,2.1,2.5,3l18.2-18.2L65.5,85c1.3-0.6,2.5-1.2,3.7-1.9L39.6,53.4L38.2,52.1z" />
      <path d="M38.2,43.7L15.5,66.4l2.8,2.8l19.9-19.9L70.9,82c1.1-0.7,2.2-1.5,3.2-2.4L39.6,45.1L38.2,43.7z" />
      <path
        d="M41,38.1l24.8-24.8c-1.3-0.6-2.6-1.1-4-1.6L36.3,37.1L14.5,59l2.8,2.8L38,41.1l0.4,0l37.2,37.2c1-0.9,1.9-1.8,2.8-2.8L41,38.1z"
      />
      <rect x="40.4" y="26.3" width="32" height="3.9"
        transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 116.2221 8.4015)" />
      <rect x="56.9" y="20.3" width="3.9" height="27.7"
        transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 76.3804 99.8893)" />
    </g>
  </svg>
  <span class="visually-hidden">{label}</span>
</span>

<style>
.loader {
  display: inline-block;
  line-height: 0;
}

svg {
  display: block;
}

.ring {
  fill: none;
  stroke: var(--color-loader-brand);
  stroke-width: 5;
}

.empty {
  fill: var(--color-loader-empty);
}

.wave {
  fill: var(--color-loader-brand);
  animation: wave 0.9s linear infinite;
}

.tide {
  animation: tide 2.6s ease-in-out infinite;
}

.stripes {
  fill: var(--color-loader-stripe);
}

/* Below 24px the crests are under a pixel, so the surface just rises flat. */
.small .wave {
  animation: none;
}

/* Reduced motion: the full mark, breathing. */
@media (prefers-reduced-motion: reduce) {
  .wave,
  .tide {
    animation: none;
  }

  svg {
    animation: breathe 2.4s ease-in-out infinite;
  }
}

[data-motion='reduce'] {
  animation: breathe 2.4s ease-in-out infinite;

  .wave,
  .tide {
    animation: none;
  }
}

/* The tide starts below the disc (empty), rests at the top (full), then drains. */
@keyframes tide {
  0%,
  100% {
    transform: translateY(92px);
  }

  70%,
  82% {
    transform: translateY(0);
  }
}

@keyframes wave {
  to {
    transform: translateX(-40px);
  }
}

@keyframes breathe {
  50% {
    opacity: 0.55;
  }
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
