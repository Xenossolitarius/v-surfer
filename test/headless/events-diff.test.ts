import { describe, it, expect } from 'vitest';
import { diffEvents } from '../../src/headless/events';
import type { EngineState } from '../../src/headless/types';

// Minimal EngineState factory — only the fields diffEvents reads.
function st(over: Partial<EngineState<unknown>> = {}): EngineState<unknown> {
  return {
    translate: 0,
    transitionDuration: 0,
    activeIndex: 0,
    realIndex: 0,
    progress: 0,
    isBeginning: true,
    isEnd: false,
    slides: [{}, {}, {}],
    slidesGrid: [0, 100, 200],
    snapGrid: [0, 100, 200],
    slidesSizesGrid: [100, 100, 100],
    layout: { direction: 'horizontal' },
    ...over,
  } as unknown as EngineState<unknown>;
}

const names = (evs: { name: string }[]) => evs.map((e) => e.name);

describe('diffEvents', () => {
  it('emits nothing when prev is null (first commit)', () => {
    expect(diffEvents(null, st())).toEqual([]);
  });

  it('emits nothing for an identical snapshot', () => {
    expect(diffEvents(st(), st())).toEqual([]);
  });

  it('emits activeIndexChange + slideChange on activeIndex change', () => {
    const got = names(diffEvents(st(), st({ activeIndex: 1, isBeginning: false })));
    expect(got).toContain('activeIndexChange');
    expect(got).toContain('slideChange');
  });

  it('emits realIndexChange on realIndex change', () => {
    expect(names(diffEvents(st(), st({ realIndex: 2 })))).toContain('realIndexChange');
  });

  it('emits setTranslate with the new translate as arg', () => {
    const evs = diffEvents(st(), st({ translate: -50 }));
    expect(evs.find((e) => e.name === 'setTranslate')).toEqual({ name: 'setTranslate', arg: -50 });
  });

  it('emits setTransition with the new duration as arg', () => {
    const evs = diffEvents(st(), st({ transitionDuration: 300 }));
    expect(evs.find((e) => e.name === 'setTransition')).toEqual({
      name: 'setTransition',
      arg: 300,
    });
  });

  it('emits progress with the new progress as arg', () => {
    const evs = diffEvents(st(), st({ progress: 0.5 }));
    expect(evs.find((e) => e.name === 'progress')).toEqual({ name: 'progress', arg: 0.5 });
  });

  it('emits reachEnd + toEdge when entering the end', () => {
    const got = names(
      diffEvents(st({ isBeginning: false }), st({ isBeginning: false, isEnd: true })),
    );
    expect(got).toContain('reachEnd');
    expect(got).toContain('toEdge');
  });

  it('emits reachBeginning + toEdge when entering the beginning', () => {
    const got = names(diffEvents(st({ isBeginning: false }), st({ isBeginning: true })));
    expect(got).toContain('reachBeginning');
    expect(got).toContain('toEdge');
  });

  it('emits fromEdge when leaving an edge', () => {
    const got = names(diffEvents(st({ isBeginning: true }), st({ isBeginning: false })));
    expect(got).toContain('fromEdge');
  });

  it('emits snapIndexChange when the nearest snap changes', () => {
    // translate -100 → nearest snapGrid entry index 1; translate 0 → index 0.
    const got = names(
      diffEvents(st({ translate: 0 }), st({ translate: -100, isBeginning: false })),
    );
    expect(got).toContain('snapIndexChange');
  });

  it('emits length-change + slidesUpdated when the grids change', () => {
    const got = names(
      diffEvents(
        st(),
        st({
          slides: [{}, {}],
          slidesGrid: [0, 100],
          snapGrid: [0, 100],
          slidesSizesGrid: [100, 100],
        }),
      ),
    );
    expect(got).toContain('slidesLengthChange');
    expect(got).toContain('snapGridLengthChange');
    expect(got).toContain('slidesGridLengthChange');
    expect(got).toContain('slidesUpdated');
  });

  it('emits slidesUpdated (not length changes) when only sizes change', () => {
    const got = names(diffEvents(st(), st({ slidesSizesGrid: [120, 100, 100] })));
    expect(got).toContain('slidesUpdated');
    expect(got).not.toContain('slidesLengthChange');
  });

  it('emits changeDirection on direction change', () => {
    const got = names(diffEvents(st(), st({ layout: { direction: 'vertical' } as never })));
    expect(got).toContain('changeDirection');
  });
});
