import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../../src/vue/surfer';
import Item from '../../../src/vue/item';
import { defineEffectModule, type EffectDescriptor } from '../../../src/vue/effects/base';
import type { ModuleHost } from '../../../src/vue/module-host';
import type { ComputedSlide } from '../../../src/headless/types';
import type { EffectCtx, SlideStyle } from '../../../src/vue/effects/base';

interface TestParams {
  opacity: number;
}

// Trivial descriptor: sets opacity = slide.progress on each slide.
const testDescriptor: EffectDescriptor<TestParams> = {
  name: 'testEffect',
  defaults: { opacity: 1 },
  classes: () => ['v-surfer-test-effect'],
  virtualTranslate: () => true,
  paramOverrides: () => ({ slidesPerView: 1 }),
  slideStyle: (
    slide: ComputedSlide<unknown>,
    _ctx: EffectCtx,
    _params: TestParams,
  ): SlideStyle => ({
    opacity: slide.progress,
    transform: `translate3d(0px,0px,0px)`,
  }),
};

const { module: testModule, component: TestEffect } = defineEffectModule(testDescriptor);

function mountWithEffect(count = 3) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      modules: [testModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(TestEffect),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('defineEffectModule (base)', () => {
  it('publishes effectClasses, virtualTranslate, and paramOverrides on mount', async () => {
    const { wrapper, getHost } = mountWithEffect();
    await flushPromises();
    const host = getHost();
    expect(host.effectClasses.value).toContain('v-surfer-test-effect');
    expect(host.virtualTranslate.value).toBe(true);
    expect(host.paramOverrides.value).toMatchObject({ slidesPerView: 1 });
    wrapper.unmount();
  });

  it('applies slide styles imperatively to each .v-surfer-slide element', async () => {
    const { wrapper } = mountWithEffect(3);
    await flushPromises();

    // Wait for slideEls to be populated
    await flushPromises();

    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);

    // Each slide should have transform set by the effect
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.transform).toBe('translate3d(0px,0px,0px)');
    }

    // opacity should match slide.progress (0 for active, -1 for prev, 1 for next approximately)
    // Just check that opacity is set (a number string)
    const activeSlide = slides.find((s) => s.element.classList.contains('v-surfer-slide-active'));
    expect(activeSlide).toBeDefined();
    const activeEl = activeSlide!.element as HTMLElement;
    // Active slide progress is 0, so opacity = 0
    expect(activeEl.style.opacity).toBe('0');

    wrapper.unmount();
  });

  it('resets effectClasses, virtualTranslate, paramOverrides on unmount', async () => {
    const { wrapper, getHost } = mountWithEffect();
    await flushPromises();
    const host = getHost();
    expect(host.effectClasses.value).toContain('v-surfer-test-effect');

    wrapper.unmount();

    expect(host.effectClasses.value).toEqual([]);
    expect(host.virtualTranslate.value).toBe(false);
    expect(host.paramOverrides.value).toEqual({});
  });
});
