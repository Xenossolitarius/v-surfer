/** Pure ports of the frozen `Mousewheel` normalize + delta logic (no DOM). */

export interface NormalizedWheel {
  spinX: number;
  spinY: number;
  pixelX: number;
  pixelY: number;
}

/** The wheel-event fields `normalizeWheel` reads (standard + legacy/non-standard). */
export interface WheelEventProps {
  detail?: number;
  wheelDelta?: number;
  wheelDeltaX?: number;
  wheelDeltaY?: number;
  deltaX?: number;
  deltaY?: number;
  deltaMode?: number;
  shiftKey?: boolean;
  axis?: number;
  HORIZONTAL_AXIS?: number;
}

// Verbatim port of `src/modules/mousewheel/mousewheel.ts:42-120`.
export function normalizeWheel(e: WheelEventProps): NormalizedWheel {
  const PIXEL_STEP = 10;
  const LINE_HEIGHT = 40;
  const PAGE_HEIGHT = 800;

  // oxlint-disable-next-line typescript/no-explicit-any -- legacy/non-standard wheel props (wheelDelta*, axis, HORIZONTAL_AXIS) are not on the WheelEventProps type for older engines.
  const ev = e as any;

  let sX = 0;
  let sY = 0;
  let pX = 0;
  let pY = 0;

  if ('detail' in e) sY = e.detail as number;
  if ('wheelDelta' in e) sY = -(ev.wheelDelta as number) / 120;
  if ('wheelDeltaY' in e) sY = -(ev.wheelDeltaY as number) / 120;
  if ('wheelDeltaX' in e) sX = -(ev.wheelDeltaX as number) / 120;

  if ('axis' in e && ev.axis === ev.HORIZONTAL_AXIS) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in e) pY = e.deltaY as number;
  if ('deltaX' in e) pX = e.deltaX as number;

  if (e.shiftKey && !pX) {
    pX = pY;
    pY = 0;
  }

  if ((pX || pY) && e.deltaMode) {
    if (e.deltaMode === 1) {
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  if (pX && !sX) sX = pX < 1 ? -1 : 1;
  if (pY && !sY) sY = pY < 1 ? -1 : 1;

  return { spinX: sX, spinY: sY, pixelX: pX, pixelY: pY };
}

export interface WheelDeltaParams {
  direction: 'horizontal' | 'vertical';
  rtl: boolean;
  forceToAxis: boolean;
  invert: boolean;
}

// Port of `mousewheel.ts:212-229`. Returns the signed, post-invert delta, or null
// when the wheel should be ignored / released to the page.
export function wheelDelta(n: NormalizedWheel, params: WheelDeltaParams): number | null {
  const rtlFactor = params.rtl ? -1 : 1;
  let delta = 0;
  if (params.forceToAxis) {
    if (params.direction === 'horizontal') {
      if (Math.abs(n.pixelX) > Math.abs(n.pixelY)) delta = -n.pixelX * rtlFactor;
      else return null;
    } else if (Math.abs(n.pixelY) > Math.abs(n.pixelX)) {
      delta = -n.pixelY;
    } else {
      return null;
    }
  } else {
    delta = Math.abs(n.pixelX) > Math.abs(n.pixelY) ? -n.pixelX * rtlFactor : -n.pixelY;
  }
  if (delta === 0) return null;
  if (params.invert) delta = -delta;
  return delta;
}

export interface WheelEdges {
  isBeginning: boolean;
  isEnd: boolean;
  loop: boolean;
}

export interface WheelControllerParams {
  freeMode: boolean;
  sticky: boolean;
  releaseOnEdges: boolean;
  thresholdDelta: number | null;
  thresholdTime: number | null;
  sensitivity: number;
}

export type WheelEffect =
  | { kind: 'none' }
  | { kind: 'slide'; dir: 'next' | 'prev' }
  | { kind: 'scrub'; targetDelta: number }
  | { kind: 'snap'; threshold: number };

export interface WheelOutcome {
  effect: WheelEffect;
  preventDefault: boolean;
}

interface WheelRec {
  time: number;
  delta: number;
  direction: number;
}

/**
 * Stateful timing core of the frozen `Mousewheel` module (no DOM, no clock —
 * timestamps are injected). `step` consumes one wheel sample; `due` releases a
 * scheduled sticky snap once the component's clock passes the scheduled time.
 */
export class WheelController {
  private readonly p: WheelControllerParams;
  private lastScrollTime = 0;
  private recent: WheelRec[] = [];
  private lastEventBeforeSnap: WheelRec | undefined;
  private pendingSnap: { at: number; threshold: number; deferReset: boolean; ev: WheelRec } | null =
    null;

  constructor(params: WheelControllerParams) {
    this.p = params;
  }

  step(delta: number, time: number, edges: WheelEdges): WheelOutcome {
    const ev: WheelRec = { time, delta: Math.abs(delta), direction: Math.sign(delta) };
    return this.p.freeMode ? this.free(ev, delta, time) : this.discrete(ev, time, edges);
  }

  due(now: number): WheelEffect | null {
    if (this.pendingSnap && now >= this.pendingSnap.at) {
      const snap = this.pendingSnap;
      this.pendingSnap = null;
      if (snap.deferReset) {
        this.lastEventBeforeSnap = snap.ev;
        this.recent = [];
      }
      return { kind: 'snap', threshold: snap.threshold };
    }
    return null;
  }

  // ---- discrete (port of animateSlider + recentWheelEvents gate) ----
  private discrete(ev: WheelRec, time: number, edges: WheelEdges): WheelOutcome {
    if (this.recent.length >= 2) this.recent.shift();
    const prev = this.recent.length ? this.recent[this.recent.length - 1] : undefined;
    this.recent.push(ev);

    let slid: 'next' | 'prev' | null = null;
    const shouldAnimate =
      !prev ||
      ev.direction !== prev.direction ||
      ev.delta > prev.delta ||
      ev.time > prev.time + 150;
    if (shouldAnimate) slid = this.animate(ev, time, edges);

    if (this.release(ev.direction, edges))
      return { effect: { kind: 'none' }, preventDefault: false };
    if (slid) return { effect: { kind: 'slide', dir: slid }, preventDefault: true };
    return { effect: { kind: 'none' }, preventDefault: true };
  }

  private animate(ev: WheelRec, time: number, edges: WheelEdges): 'next' | 'prev' | null {
    if (this.p.thresholdDelta != null && ev.delta < this.p.thresholdDelta) return null;
    if (this.p.thresholdTime != null && time - this.lastScrollTime < this.p.thresholdTime) {
      return null;
    }
    if (ev.delta >= 6 && time - this.lastScrollTime < 60) return null;
    let dir: 'next' | 'prev' | null = null;
    if (ev.direction < 0) {
      if (!edges.isEnd || edges.loop) dir = 'next';
    } else if (!edges.isBeginning || edges.loop) {
      dir = 'prev';
    }
    this.lastScrollTime = time;
    return dir;
  }

  private release(direction: number, edges: WheelEdges): boolean {
    if (direction < 0) return edges.isEnd && !edges.loop && this.p.releaseOnEdges;
    return edges.isBeginning && !edges.loop && this.p.releaseOnEdges;
  }

  // ---- free mode (port of mousewheel.ts:291-427) ----
  private free(ev: WheelRec, delta: number, time: number): WheelOutcome {
    const ignore =
      !!this.lastEventBeforeSnap &&
      ev.time < this.lastEventBeforeSnap.time + 500 &&
      ev.delta <= this.lastEventBeforeSnap.delta &&
      ev.direction === this.lastEventBeforeSnap.direction;
    if (ignore) return { effect: { kind: 'none' }, preventDefault: true };
    this.lastEventBeforeSnap = undefined;

    if (this.p.sticky) this.scheduleSticky(ev, delta, time);

    // releaseOnEdges in free mode depends on the POST-scrub position; the component
    // refines preventDefault after applying the scrub. The controller defaults to true.
    return {
      effect: { kind: 'scrub', targetDelta: delta * this.p.sensitivity },
      preventDefault: true,
    };
  }

  private scheduleSticky(ev: WheelRec, delta: number, time: number): void {
    this.pendingSnap = null; // frozen: clearTimeout at the top of the sticky block
    if (this.recent.length >= 15) this.recent.shift();
    const prev = this.recent.length ? this.recent[this.recent.length - 1] : undefined;
    const first = this.recent[0];
    this.recent.push(ev);

    if (prev && (ev.delta > prev.delta || ev.direction !== prev.direction)) {
      this.recent = []; // user restarted scrolling
    } else if (
      this.recent.length >= 15 &&
      ev.time - first.time < 500 &&
      first.delta - ev.delta >= 1 &&
      ev.delta <= 6
    ) {
      const threshold = delta > 0 ? 0.8 : 0.2;
      this.lastEventBeforeSnap = ev;
      this.recent = [];
      this.pendingSnap = { at: time, threshold, deferReset: false, ev }; // immediate
    }
    if (!this.pendingSnap) {
      this.pendingSnap = { at: time + 500, threshold: 0.5, deferReset: true, ev }; // fallback
    }
  }
}
