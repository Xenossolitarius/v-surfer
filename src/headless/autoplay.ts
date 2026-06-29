/** Pure ports of the frozen `Autoplay` advance decision + time math (no DOM, no clock). */

export interface AutoplayDirectionParams {
  reverseDirection: boolean;
  stopOnLastSlide: boolean;
  loop: boolean;
  rewind: boolean;
}

export interface AutoplayEdges {
  isBeginning: boolean;
  isEnd: boolean;
  slidesLength: number;
}

export type AutoplayCommand =
  | { kind: 'next' }
  | { kind: 'prev' }
  | { kind: 'slideTo'; index: number }
  | { kind: 'none' };

// Port of `proceed` in `src/modules/autoplay/autoplay.ts:110-129`.
export function autoplayAdvance(
  params: AutoplayDirectionParams,
  edges: AutoplayEdges,
): AutoplayCommand {
  if (params.reverseDirection) {
    if (!edges.isBeginning || params.loop || params.rewind) return { kind: 'prev' };
    if (!params.stopOnLastSlide) return { kind: 'slideTo', index: edges.slidesLength - 1 };
    return { kind: 'none' };
  }
  if (!edges.isEnd || params.loop || params.rewind) return { kind: 'next' };
  if (!params.stopOnLastSlide) return { kind: 'slideTo', index: 0 };
  return { kind: 'none' };
}

// Port of the pause time math (autoplay.ts:188-191): remaining ms until the next advance.
export function remainingTimeLeft(startTime: number, delay: number, now: number): number {
  return Math.max(0, startTime + delay - now);
}

export interface AutoplayControllerParams {
  delay: number;
  reverseDirection: boolean;
  stopOnLastSlide: boolean;
  loop: boolean;
  rewind: boolean;
  disableOnInteraction: boolean;
}

/**
 * Clock-injected state machine for the frozen `Autoplay` module (no internal
 * timers — the component supplies `now` and schedules the delays this returns).
 */
export class AutoplayController {
  running = false;
  paused = false;
  private readonly p: AutoplayControllerParams;
  private startTime = 0;
  private stored = 0; // remaining ms captured at pause

  constructor(params: AutoplayControllerParams) {
    this.p = params;
  }

  private direction(): AutoplayDirectionParams {
    return {
      reverseDirection: this.p.reverseDirection,
      stopOnLastSlide: this.p.stopOnLastSlide,
      loop: this.p.loop,
      rewind: this.p.rewind,
    };
  }

  start(now: number): number {
    this.running = true;
    this.paused = false;
    return this.armNext(now);
  }

  armNext(now: number): number {
    this.startTime = now;
    return this.p.delay;
  }

  stop(): void {
    this.running = false;
    this.paused = false;
  }

  pause(now: number, opts?: { reset?: boolean }): void {
    if (!this.running) return;
    // Already paused: preserve the frozen remaining. A repeated non-reset pause (e.g. a
    // tap while hovering) must NOT recompute from the stale startTime — wall-clock time
    // elapsed while paused would otherwise shrink `stored` on every interaction.
    if (this.paused) {
      if (opts?.reset) this.stored = this.p.delay;
      return;
    }
    this.paused = true;
    this.stored = opts?.reset ? this.p.delay : remainingTimeLeft(this.startTime, this.p.delay, now);
  }

  resume(now: number): number | null {
    if (!this.running || !this.paused) return null;
    this.paused = false;
    // Offset startTime so timeLeft(now) === stored and counts down from there.
    this.startTime = now + this.stored - this.p.delay;
    return this.stored;
  }

  fire(edges: AutoplayEdges): AutoplayCommand {
    return autoplayAdvance(this.direction(), edges);
  }

  interaction(now: number, opts?: { reset?: boolean }): 'stop' | 'pause' {
    if (this.p.disableOnInteraction) {
      this.stop();
      return 'stop';
    }
    this.pause(now, { reset: opts?.reset ?? false });
    return 'pause';
  }

  timeLeft(now: number): number {
    if (!this.running) return 0;
    return this.paused ? this.stored : remainingTimeLeft(this.startTime, this.p.delay, now);
  }
}
