import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectFlipModule } from '../../src/vue/effects/flip';
import KitEffectFlip from '../../src/vue/effects/flip';

function mountFlip(flipConfig?: { slideShadows?: boolean; limitRotation?: boolean }) {
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectFlipModule],
      config: flipConfig !== undefined ? { flip: flipConfig } : {},
    },
    slots: {
      default: () => [
        ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectFlip),
      ],
    },
  });
  return { wrapper };
}

describe('flip effect (module + component)', () => {
  it('adds v-surfer-flip and v-surfer-3d classes to the container', async () => {
    const { wrapper } = mountFlip();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-flip')).toBe(true);
    expect(container.classList.contains('v-surfer-3d')).toBe(true);
    wrapper.unmount();
  });

  it('each slide has a transform with rotateY or rotateX', async () => {
    const { wrapper } = mountFlip();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.transform).toMatch(/rotateY|rotateX/);
    }
    wrapper.unmount();
  });

  it('slideShadows:true (default) injects .v-surfer-slide-shadow-flip children on each slide', async () => {
    const { wrapper } = mountFlip({ slideShadows: true, limitRotation: true });
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const shadowEls = slide.element.querySelectorAll('.v-surfer-slide-shadow-flip');
      expect(shadowEls.length).toBeGreaterThan(0);
    }
    wrapper.unmount();
  });

  it('slideShadows:false injects no .v-surfer-slide-shadow-flip children', async () => {
    const { wrapper } = mountFlip({ slideShadows: false, limitRotation: true });
    await flushPromises();
    const shadowEls = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-flip');
    expect(shadowEls.length).toBe(0);
    wrapper.unmount();
  });

  it('forces slidesPerView:1 via paramOverrides (slidesSizesGrid[0] = container width)', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectFlipModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectFlip),
        ],
      },
    });
    await flushPromises();
    expect(host.state.value.slidesSizesGrid[0]).toBe(800);
    wrapper.unmount();
  });
});
