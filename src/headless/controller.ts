import type { Engine } from './types';
import { minTranslate, maxTranslate } from './translate';

/** A piecewise-linear interpolator mapping x-grid values onto y-grid values. */
export interface LinearSpline {
  interpolate(x2: number): number;
}

/**
 * Port of frozen `Controller`'s LinearSpline (src/modules/controller/controller.ts).
 * Binary-searches `x` for the bracket around `x2`, then linearly interpolates the
 * matching `y` values. `interpolate(0)` short-circuits to 0 (frozen `if (!x2)`).
 * At/after the last grid point the search returns `x.length` (out of bounds), so
 * `interpolate` yields NaN — frozen relies on its `!controlledTranslate` fallback
 * to handle that, and so does `controlledTranslate` below.
 */
export function createLinearSpline(x: number[], y: number[]): LinearSpline {
  const binarySearch = (() => {
    let maxIndex: number;
    let minIndex: number;
    let guess: number;
    return (array: number[], val: number): number => {
      minIndex = -1;
      maxIndex = array.length;
      // (maxIndex + minIndex) is always >= 0 here, so Math.floor(.../2) === frozen's `>> 1`.
      while (maxIndex - minIndex > 1) {
        guess = Math.floor((maxIndex + minIndex) / 2);
        if (array[guess] <= val) {
          minIndex = guess;
        } else {
          maxIndex = guess;
        }
      }
      return maxIndex;
    };
  })();

  let i1: number;
  let i3: number;

  return {
    interpolate(x2: number): number {
      if (!x2) return 0;
      i3 = binarySearch(x, x2);
      i1 = i3 - 1;
      return ((x2 - x[i1]) * (y[i3] - y[i1])) / (x[i3] - x[i1]) + y[i1];
    },
  };
}

export interface ControlledTranslateInput {
  by: 'slide' | 'container';
  inverse: boolean;
  loop: boolean;
  rtl: boolean;
  master: { translate: number; snapGrid: number[]; slidesGrid: number[] };
  slave: { snapGrid: number[]; slidesGrid: number[] };
}

/**
 * Port of frozen `setControlledTranslate` (src/modules/controller/controller.ts):
 * map the master's translate onto the slave's translate range. slide mode uses a
 * LinearSpline over the grids; whenever the slide result is falsy (incl. the
 * NaN/0 edges) OR by==='container', a linear multiplier mapping takes over;
 * inverse reflects about the slave's maxTranslate.
 */
export function controlledTranslate(input: ControlledTranslateInput): number {
  const { by, inverse, loop, rtl, master, slave } = input;
  const t = rtl ? -master.translate : master.translate;
  let controlled = 0;

  if (by === 'slide') {
    const xGrid = loop ? master.slidesGrid : master.snapGrid;
    const yGrid = loop ? slave.slidesGrid : slave.snapGrid;
    const spline = createLinearSpline(xGrid, yGrid);
    controlled = -spline.interpolate(-t);
  }

  if (!controlled || by === 'container') {
    const sMin = minTranslate(master.snapGrid);
    const sMax = maxTranslate(master.snapGrid);
    const cMin = minTranslate(slave.snapGrid);
    const cMax = maxTranslate(slave.snapGrid);
    let multiplier = (cMax - cMin) / (sMax - sMin);
    if (Number.isNaN(multiplier) || !Number.isFinite(multiplier)) {
      multiplier = 1;
    }
    controlled = (t - sMin) * multiplier + cMin;
  }

  if (inverse) {
    controlled = maxTranslate(slave.snapGrid) - controlled;
  }

  return controlled;
}

export interface ControllerEdge {
  from: Engine<unknown>; // master
  to: Engine<unknown>; // slave
  by?: 'slide' | 'container'; // default 'slide'
  inverse?: boolean; // default false
  loop?: boolean; // master's loop — selects slidesGrid vs snapGrid (default false)
  rtl?: boolean; // master's rtl — flips the read translate (default false)
}

export interface ControllerLink {
  destroy(): void;
}

/**
 * Subscribe directed edges (master → slave) together under ONE shared reentrancy
 * guard — the headless analog of frozen's `byController`. Emits are synchronous,
 * so while we apply a push to a slave, that slave's echoing emit is ignored
 * (`applying` is true). This intentionally serializes propagation to ONE hop:
 * star (one master → many slaves) and A↔B mutual both work, but a transitive
 * chain A→B→C in a single call would NOT drive C (B's onward push lands while
 * `applying` is still true and is suppressed). `SurferController` only ever emits
 * star + optional two-way edges, never chains, so this is not a limitation in
 * practice. For mutual control pass BOTH directions as edges in the SAME call;
 * two separate calls would not share the guard and would feedback-loop.
 *
 * A master only drives its slaves when its translate actually CHANGES. The headless
 * engine fuses state-update and subscriber-emit into one `commit()`, so a no-op
 * `slideTo` (target translate === current) still emits — but frozen's `slideTo`
 * suppresses the `setTranslate` event in exactly that case (translate unchanged +
 * `effect: 'slide'`; see core/slide/slideTo.ts), so the controlled surfer is NOT
 * driven. We replicate that by skipping propagation when the master's translate is
 * unchanged since its previous emit (tracked even while guarded, so a slave driven
 * by its peer records the position it was moved to). Frozen's `setTranslate` itself
 * always emits even on an unchanged value; that degenerate repeat is not replicated.
 */
export function linkControllers(edges: ControllerEdge[]): ControllerLink {
  let applying = false;
  const unsubs: Array<() => void> = [];
  const masters = new Set(edges.map((e) => e.from));

  for (const master of masters) {
    const outgoing = edges.filter((e) => e.from === master);
    let lastTranslate = master.state.translate;
    const unsub = master.subscribe((state) => {
      const changed = state.translate !== lastTranslate;
      lastTranslate = state.translate;
      if (applying || !changed) return;
      applying = true;
      try {
        for (const edge of outgoing) {
          const t = controlledTranslate({
            by: edge.by ?? 'slide',
            inverse: edge.inverse ?? false,
            loop: edge.loop ?? false,
            rtl: edge.rtl ?? false,
            master: {
              translate: state.translate,
              snapGrid: state.snapGrid,
              slidesGrid: state.slidesGrid,
            },
            slave: {
              snapGrid: edge.to.state.snapGrid,
              slidesGrid: edge.to.state.slidesGrid,
            },
          });
          edge.to.setTranslate(t, { speed: state.transitionDuration });
        }
      } finally {
        applying = false;
      }
    });
    unsubs.push(unsub);
  }

  return {
    destroy() {
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
    },
  };
}
