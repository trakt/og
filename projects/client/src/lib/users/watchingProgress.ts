export interface WatchingProgress {
  /** 0 to 100. */
  readonly percent: number;
  /** `h:mm` watched so far. */
  readonly elapsed: string;
  /** `h:mm` in total. */
  readonly runtime: string;
  readonly done: boolean;
}

/** OG's watching-now ticker (`users.js`): how far into `runtime` minutes ending at `endsAt` the time `now` is. */
export function watchingProgress(
  { endsAt, runtime, now }: { endsAt: string; runtime: number; now: number },
): WatchingProgress {
  const end = Date.parse(endsAt);
  const start = end - runtime * 60_000;
  const raw = ((now - start) / (end - start)) * 100;
  const percent = Math.min(100, Math.max(0, raw));

  return {
    percent,
    elapsed: hoursMinutes(Math.floor((runtime * percent) / 100)),
    runtime: hoursMinutes(runtime),
    done: raw >= 100,
  };
}

function hoursMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}
