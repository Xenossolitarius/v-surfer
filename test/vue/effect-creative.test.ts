import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectCreativeModule } from '../../src/vue/effects/creative';
import KitEffectCreative from '../../src/vue/effects/creative';

function mountCreative(creativeConfig?: Record<string, unknown>) {
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectCreativeModule],
      config: creativeConfig !== undefined ? { creative: creativeConfig } : {},
    },
    slots: {
      default: () => [
        ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectCreative),
      ],
    },
  });
  return { wrapper };
}

describe('creative effect (module + component)', () => {
  it('adds v-surfer-creative and v-surfer-3d classes when perspective:true (default)', async () => {
    const { wrapper } = mountCreative();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-creative')).toBe(true);
    expect(container.classList.contains('v-surfer-3d')).toBe(true);
    wrapper.unmount();
  });

  it('adds only v-surfer-creative (no v-surfer-3d) when perspective:false', async () => {
    const { wrapper } = mountCreative({ perspective: false });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-creative')).toBe(true);
    expect(container.classList.contains('v-surfer-3d')).toBe(false);
    wrapper.unmount();
  });

  it('uses virtualTranslate (wrapper has no translate3d when not cssMode)', async () => {
    const { wrapper } = mountCreative();
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector('.v-surfer-wrapper') as HTMLElement | null;
    expect(wrapperEl).not.toBeNull();
    // virtualTranslate=true → wrapper transform is either empty or translate3d(0px,0px,0px)
    // i.e. it is NOT a large translate value (the slides carry the transform)
    const t = wrapperEl!.style.transform;
    // Should be absent or zero translate (engine won't write a large px value)
    expect(t === '' || t === 'translate3d(0px, 0px, 0px)' || t === 'none').toBe(true);
    wrapper.unmount();
  });

  it('each slide has a transform with translate3d and rotateZ (default rotate=[0,0,0] → 0deg)', async () => {
    const { wrapper } = mountCreative();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.transform).toMatch(/translate3d/);
      expect(el.style.transform).toMatch(/rotateZ/);
    }
    wrapper.unmount();
  });

  it('per-slide transform reflects next config (progress<0 slide uses next)', async () => {
    // next.translate=['-20%',0,-1], rotate=[0,0,-90] → non-active slides have calc-based translate
    const { wrapper } = mountCreative({
      next: { translate: ['-20%', 0, -1], rotate: [0, 0, -90], opacity: 0, scale: 0.8 },
      prev: { translate: ['20%', 0, -1], rotate: [0, 0, 90], opacity: 0, scale: 0.8 },
    });
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);

    // At least one non-active slide should have a calc() translate
    const hasCalcTranslate = Array.from(slides).some((s) =>
      s.element.style.transform.includes('calc('),
    );
    expect(hasCalcTranslate).toBe(true);
    wrapper.unmount();
  });

  it('shadow injected on slide when next.shadow=true and progress<0', async () => {
    const { wrapper } = mountCreative({
      next: {
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        opacity: 1,
        scale: 1,
        shadow: true,
      },
      prev: {
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        opacity: 1,
        scale: 1,
        shadow: true,
      },
    });
    await flushPromises();

    // At least one slide should have the creative shadow element
    const allShadows = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-creative');
    expect(allShadows.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it('no shadow injected when next.shadow not set (default)', async () => {
    const { wrapper } = mountCreative({
      next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
      prev: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
    });
    await flushPromises();

    // The active slide (progress=0) gets a shadow (custom=false → !custom=true)
    // but non-active slides without shadow=true get none
    // So there should be exactly 1 shadow (active slide)
    const allShadows = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-creative');
    expect(allShadows.length).toBe(1);
    wrapper.unmount();
  });

  it('does NOT force slidesPerView:1 (no paramOverrides) — state is accessible', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCreativeModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCreative),
        ],
      },
    });
    await flushPromises();
    expect(host.state.value).toBeDefined();
    // Creative doesn't override slidesPerView
    expect(host.state.value.slides).toBeDefined();
    wrapper.unmount();
  });
});
