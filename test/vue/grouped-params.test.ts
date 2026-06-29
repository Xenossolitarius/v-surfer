import { describe, it, expect } from 'vitest';
import { useSurferHost } from '../../src/vue/module-host';

describe('useSurferHost accepts grouped param input', () => {
  it('forwards nested groups to the engine, resolved to flat params', () => {
    const host = useSurferHost({
      freeMode: { sticky: true, momentumRatio: 0.5 },
      loop: { additionalSlides: 2 },
      touch: { threshold: 12 },
      centered: true,
    });
    expect(host.engine.params.freeMode).toBe(true);
    expect(host.engine.params.freeModeSticky).toBe(true);
    expect(host.engine.params.freeModeMomentumRatio).toBe(0.5);
    expect(host.engine.params.loop).toBe(true);
    expect(host.engine.params.loopAdditionalSlides).toBe(2);
    expect(host.engine.params.threshold).toBe(12);
    expect(host.engine.params.centeredSlides).toBe(true);
    host.dispose();
  });

  it('still accepts the flat form (back-compat)', () => {
    const host = useSurferHost({ loop: true, loopAdditionalSlides: 3, freeModeSticky: true });
    expect(host.engine.params.loop).toBe(true);
    expect(host.engine.params.loopAdditionalSlides).toBe(3);
    expect(host.engine.params.freeModeSticky).toBe(true);
    host.dispose();
  });
});
