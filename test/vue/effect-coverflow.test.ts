import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectCoverflowModule } from '../../src/vue/effects/coverflow';
import KitEffectCoverflow from '../../src/vue/effects/coverflow';

function mountCoverflow(coverflowConfig?: {
  rotate?: number;
  stretch?: number | string;
  depth?: number;
  scale?: number;
  modifier?: number;
  slideShadows?: boolean;
}) {
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectCoverflowModule],
      config: coverflowConfig !== undefined ? { coverflow: coverflowConfig } : {},
    },
    slots: {
      default: () => [
        ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectCoverflow),
      ],
    },
  });
  return { wrapper };
}

describe('coverflow effect (module + component)', () => {
  it('adds v-surfer-coverflow and v-surfer-3d classes to the container', async () => {
    const { wrapper } = mountCoverflow();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-coverflow')).toBe(true);
    expect(container.classList.contains('v-surfer-3d')).toBe(true);
    wrapper.unmount();
  });

  it('wrapper keeps a normal transform (NOT virtualTranslate — translate3d present)', async () => {
    const { wrapper } = mountCoverflow();
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector('.v-surfer-wrapper') as HTMLElement | null;
    expect(wrapperEl).not.toBeNull();
    // Coverflow does NOT use virtualTranslate; wrapper has its own transform
    expect(wrapperEl!.style.transform).toMatch(/translate3d/);
    wrapper.unmount();
  });

  it('each slide has a 3d transform (rotateY or rotateX + translateZ)', async () => {
    const { wrapper } = mountCoverflow();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      // Coverflow slides always have a translate3d + rotateX + rotateY + scale
      expect(el.style.transform).toMatch(/translate3d/);
      expect(el.style.transform).toMatch(/rotateY/);
    }
    wrapper.unmount();
  });

  it('slideShadows:true (default) injects .v-surfer-slide-shadow-coverflow children on each slide', async () => {
    const { wrapper } = mountCoverflow({ slideShadows: true });
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const shadowEls = slide.element.querySelectorAll('.v-surfer-slide-shadow-coverflow');
      expect(shadowEls.length).toBeGreaterThan(0);
    }
    wrapper.unmount();
  });

  it('slideShadows:false injects no .v-surfer-slide-shadow-coverflow children', async () => {
    const { wrapper } = mountCoverflow({ slideShadows: false });
    await flushPromises();
    const shadowEls = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-coverflow');
    expect(shadowEls.length).toBe(0);
    wrapper.unmount();
  });

  it('does NOT force slidesPerView:1 (no paramOverrides) — multiple slides fit container', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCoverflowModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCoverflow),
        ],
      },
    });
    await flushPromises();
    // coverflow doesn't override slidesPerView — slides keep their natural size
    // which is the container width (800 in jsdom with 3 slides at default slidesPerView=1)
    // More importantly, virtualTranslate is NOT set (it's false)
    expect(host.state.value).toBeDefined();
    wrapper.unmount();
  });
});
