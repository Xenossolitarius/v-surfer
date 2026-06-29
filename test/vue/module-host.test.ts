import { describe, it, expect } from 'vitest';
import { effectScope, onScopeDispose, ref, watch, nextTick, type Ref } from 'vue';
import { useSurferHost, defineSurferModule } from '../../src/vue/module-host';

// A behavior module (has an api) for exercising the typed api + dispose paths.
interface ProbeConfig {
  step?: number;
}
interface ProbeApi {
  ticks: Ref<number>;
  bump(): void;
}
const probeModule = defineSurferModule<ProbeConfig>()('probe', ({ host, config }): ProbeApi => {
  const ticks = ref(0);
  // react to config changes (sync) to prove config→module reactivity
  watch(
    () => config.step,
    () => {
      ticks.value += 1;
    },
    { flush: 'sync' },
  );
  onScopeDispose(() => {
    ticks.value = -1;
  });
  return {
    ticks,
    bump: () => {
      host.next();
    },
  };
});
// A config-only module (no setup → no api).
const markModule = defineSurferModule<{ on?: boolean }>()('mark');

function seed(host: ReturnType<typeof useSurferHost>, n: number) {
  host.engine.setGeometry({ containerSize: 800 });
  host.engine.setSlides(Array.from({ length: n }, (_, i) => ({ data: i })));
}

describe('useSurferHost (engine-backed)', () => {
  it('count reflects items; goTo/next/prev delegate to the engine', () => {
    const scope = effectScope();
    scope.run(() => {
      const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
      seed(host, 5);
      expect(host.count.value).toBe(5);
      host.goTo(2);
      expect(host.activeIndex.value).toBe(2);
      host.next();
      expect(host.activeIndex.value).toBe(3);
      host.prev();
      expect(host.activeIndex.value).toBe(2);
      // engine clamps (no loop): goTo(99) → last
      host.goTo(99);
      expect(host.activeIndex.value).toBe(4);
    });
    scope.stop();
  });

  it('seeds config per declared module; config-only module has no api', () => {
    const host = useSurferHost({
      modules: [probeModule, markModule],
      config: { probe: { step: 3 }, mark: { on: true } },
    });
    expect(host.config.probe.step).toBe(3);
    expect(host.config.mark.on).toBe(true);
    expect(host.modules.probe).toBeDefined();
    expect('mark' in host.modules).toBe(false);
    host.dispose();
  });

  it('host-owned api is synchronous and reactive to config', () => {
    const host = useSurferHost({ modules: [probeModule] });
    expect(host.modules.probe.ticks.value).toBe(0);
    host.config.probe.step = 1; // sync watch fires
    expect(host.modules.probe.ticks.value).toBe(1);
    host.dispose();
  });

  it('dispose() stops the module effectScope', () => {
    const host = useSurferHost({ modules: [probeModule] });
    host.dispose();
    expect(host.modules.probe.ticks.value).toBe(-1); // onScopeDispose ran
  });

  it('reactive param refs/getters reconfigure the engine (internal setParams)', async () => {
    const scope = effectScope();
    await scope.run(async () => {
      const spv = ref(1);
      const space = ref(0);
      const host = useSurferHost({
        slidesPerView: spv, // ref
        spaceBetween: () => space.value, // getter
      });
      host.engine.setGeometry({ containerSize: 800 });
      host.engine.setSlides(Array.from({ length: 4 }, (_, i) => ({ data: i })));
      expect(host.state.value.slidesSizesGrid[0]).toBe(800); // spv 1 → full width

      spv.value = 2; // ref change → internal watch → engine.setParams
      await nextTick();
      expect(host.state.value.slidesSizesGrid[0]).toBe(400); // spv 2 → 800/2

      space.value = 20; // getter change → reconfigured
      await nextTick();
      expect(host.state.value.slidesSizesGrid[0]).toBe(390); // (800 - 20) / 2
    });
    scope.stop();
  });
});
