import { describe, expect, it } from 'vitest';
import { createRequestQueue } from './createRequestQueue.ts';

/** A clock the test moves by hand, and the waits the queue asked for. */
function fakeTime() {
  let at = 0;
  const timers: { until: number; resolve: () => void }[] = [];
  return {
    now: () => at,
    wait: (ms: number) => new Promise<void>((resolve) => timers.push({ until: at + ms, resolve })),
    async advance(ms: number) {
      at += ms;
      timers.filter((timer) => timer.until <= at).forEach((timer) => timer.resolve());
      await flush();
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ok = () => Promise.resolve(new Response('ok'));

/** A task that resolves when the test says so, recording that it started. */
function deferred(log: string[], name: string) {
  let finish: (response: Response) => void = () => {};
  const task = () => {
    log.push(name);
    return new Promise<Response>((resolve) => (finish = resolve));
  };
  return { task, finish: () => finish(new Response(name)) };
}

describe('createRequestQueue', () => {
  it('should run at most `concurrency` tasks at once', async () => {
    const log: string[] = [];
    const queue = createRequestQueue({ concurrency: 2 });
    const a = deferred(log, 'a');
    [a, deferred(log, 'b'), deferred(log, 'c')].forEach((job) => void queue.run(job.task));
    await flush();
    expect(log).toEqual(['a', 'b']);

    a.finish();
    await flush();
    expect(log).toEqual(['a', 'b', 'c']);
  });

  it('should start visible work ahead of background work', async () => {
    const log: string[] = [];
    const queue = createRequestQueue({ concurrency: 1 });
    const first = deferred(log, 'first');
    void queue.run(first.task);
    void queue.run(deferred(log, 'background').task, { visible: false });
    void queue.run(deferred(log, 'visible').task);

    first.finish();
    await flush();

    expect(log).toEqual(['first', 'visible']);
  });

  it('should pace starts to `limit` per window', async () => {
    const time = fakeTime();
    const log: string[] = [];
    const queue = createRequestQueue({ limit: 2, windowMs: 1000, now: time.now, wait: time.wait });

    ['a', 'b', 'c'].forEach((name) => void queue.run(() => (log.push(name), ok())));
    await flush();
    expect(log).toEqual(['a', 'b']);

    await time.advance(1000);
    expect(log).toEqual(['a', 'b', 'c']);
  });

  it('should pause for Retry-After on a 429 and try the same request again', async () => {
    const time = fakeTime();
    const responses = [new Response('', { status: 429, headers: { 'Retry-After': '30' } }), new Response('done')];
    const queue = createRequestQueue({ now: time.now, wait: time.wait });

    const result = queue.run(() => Promise.resolve(responses.shift() ?? new Response('extra')));
    await flush();
    expect(responses).toHaveLength(1);

    await time.advance(29_000);
    expect(responses).toHaveLength(1);
    await time.advance(1000);

    expect(await (await result).text()).toBe('done');
  });

  it('should hand back the 429 once its retries are spent', async () => {
    const time = fakeTime();
    const queue = createRequestQueue({ retries: 0, now: time.now, wait: time.wait });

    const response = await queue.run(() => Promise.resolve(new Response('', { status: 429 })));

    expect(response.status).toBe(429);
  });

  it('should reject when the task throws, and keep going', async () => {
    const queue = createRequestQueue({ concurrency: 1 });

    const failed = queue.run(() => Promise.reject(new Error('offline')));
    const next = queue.run(ok);

    await expect(failed).rejects.toThrow('offline');
    expect((await next).ok).toBe(true);
  });
});
