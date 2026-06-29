import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import KitEffectCoverflow, { EffectCoverflowModule } from '../../src/vue/effects/coverflow';
import KitEffectCube, { EffectCubeModule } from '../../src/vue/effects/cube';
import type { ModuleHost } from '../../src/vue/module-host';

// Regression: effect slides (and their shadows) must carry the engine's transitionDuration so a
// programmatic next/prev/snap ANIMATES. The engine sets transitionDuration=speed on slideTo and 0
// during drag, so propagating it to the per-slide transform/opacity gives drag=instant, snap=animated.

function mountEffect(module: unknown, component: unknown, count = 5) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modules: [module] as any,
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        h(component as any),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('effect slide transition-duration', () => {
  it('factory effects: slides + shadows get transitionDuration = engine speed (0 at rest)', async () => {
    const { wrapper, getHost } = mountEffect(EffectCoverflowModule, KitEffectCoverflow);
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[1].element as HTMLElement;
    expect(slide.style.transitionDuration).toBe('0ms');

    getHost().goTo(2, { speed: 300 });
    await flushPromises();
    expect(getHost().state.value.transitionDuration).toBe(300);
    expect(slide.style.transitionDuration).toBe('300ms');
    const shadow = slide.querySelector('[class*="v-surfer-slide-shadow"]') as HTMLElement | null;
    if (shadow) expect(shadow.style.transitionDuration).toBe('300ms');
    wrapper.unmount();
  });

  it('cube: slides get transitionDuration = engine speed on a programmatic move', async () => {
    const { wrapper, getHost } = mountEffect(EffectCubeModule, KitEffectCube);
    await flushPromises();
    const slide = wrapper.findAll('.v-surfer-slide')[1].element as HTMLElement;
    expect(slide.style.transitionDuration).toBe('0ms');

    getHost().goTo(2, { speed: 300 });
    await flushPromises();
    expect(slide.style.transitionDuration).toBe('300ms');
    wrapper.unmount();
  });
});
