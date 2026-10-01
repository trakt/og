<script lang="ts">
interface Props {
  date: string;
  today?: boolean;
  filler?: boolean;
  compact?: boolean;
  autoscroll?: boolean;
}
const { date, today = false, filler = false, compact = false, autoscroll = false }: Props = $props();
const month = $derived(
  new Intl.DateTimeFormat('en-US', { month: compact ? 'short' : 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  ),
);
const weekday = $derived(
  new Intl.DateTimeFormat('en-US', { weekday: compact ? 'short' : 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  ),
);
function scrollToday(node: HTMLElement) {
  if (!today || !autoscroll) return;
  const frame = requestAnimationFrame(() =>
    node.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  );
  return () => cancelAnimationFrame(frame);
}
</script>

<h2 class={['date-separator', { today, filler, compact }]} {@attach scrollToday}>
  <span class="date">{Number(date.slice(8))}</span>
  <span class="month">{month}</span>
  <span class="weekday">{weekday}</span>
</h2>

<style>
.date-separator {
  display: grid;
  grid-template: auto auto / auto 1fr;
  margin: 0;
  padding-block-end: var(--calendar-separator-bottom);
  background: var(--color-date-separator);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  scroll-margin-block-start: var(--header-height);
  &.today {
    color: var(--brand-primary);
  }
  &.filler {
    opacity: var(--calendar-filler-opacity);
  }
  &.compact {
    padding-block-end: var(--space-lg-block);
  }
}
.date {
  grid-row: 1 / -1;
  padding-inline: var(--space-sm-inline);
  font-weight: var(--font-weight-headings-heavy);
  font-size: var(--font-size-date);
  line-height: var(--line-height-headings);
}
.month {
  padding-block-start: var(--calendar-month-top);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--calendar-month-leading);
}
.weekday {
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
}
</style>
