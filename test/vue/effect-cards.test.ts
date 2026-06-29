import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectCardsModule } from '../../src/vue/effects/cards';
import KitEffectCards from '../../src/vue/effects/cards';

function mountCards(cardsConfig?: {
  slideShadows?: boolean;
  rotate?: boolean;
  perSlideRotate?: number;
  perSlideOffset?: number;
}) {
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectCardsModule],
      config: cardsConfig !== undefined ? { cards: cardsConfig } : {},
    },
    slots: {
      default: () => [
        ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectCards),
      ],
    },
  });
  return { wrapper };
}

describe('cards effect (module + component)', () => {
  it('adds v-surfer-cards class to the container', async () => {
    const { wrapper } = mountCards();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-cards')).toBe(true);
    wrapper.unmount();
  });

  it('each slide has a transform with translate3d and rotateZ', async () => {
    const { wrapper } = mountCards();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(4);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.transform).toMatch(/translate3d/);
      expect(el.style.transform).toMatch(/rotateZ/);
    }
    wrapper.unmount();
  });

  it('each slide has a zIndex set', async () => {
    const { wrapper } = mountCards();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.zIndex).not.toBe('');
    }
    wrapper.unmount();
  });

  it('slideShadows:true (default) injects .v-surfer-slide-shadow-cards on each slide', async () => {
    const { wrapper } = mountCards({ slideShadows: true });
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(4);
    for (const slide of slides) {
      const shadowEls = slide.element.querySelectorAll('.v-surfer-slide-shadow-cards');
      expect(shadowEls.length).toBeGreaterThan(0);
    }
    wrapper.unmount();
  });

  it('slideShadows:false injects no .v-surfer-slide-shadow-cards children', async () => {
    const { wrapper } = mountCards({ slideShadows: false });
    await flushPromises();
    const shadowEls = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-cards');
    expect(shadowEls.length).toBe(0);
    wrapper.unmount();
  });

  it('forces slidesPerView:1 via paramOverrides (slidesSizesGrid[0] == container width)', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCardsModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCards),
        ],
      },
    });
    await flushPromises();
    // slidesPerView:1 with centeredSlides:true → slide fills container
    expect(host.state.value.slidesSizesGrid[0]).toBe(800);
    wrapper.unmount();
  });

  it('forces centeredSlides:true via paramOverrides', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCardsModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCards),
        ],
      },
    });
    await flushPromises();
    expect(host.state.value.layout.centeredSlides).toBe(true);
    wrapper.unmount();
  });

  it('custom perSlideRotate:4 alters rotateZ on non-active slides', async () => {
    const { wrapper } = mountCards({ perSlideRotate: 4, rotate: true });
    await flushPromises();
    // The non-active slide (progress ≠ 0) should have rotateZ with larger angle
    // Active slide has progress=0 so rotateZ(0deg) always; check non-active
    const slides = wrapper.findAll('.v-surfer-slide');
    const nonActive = slides
      .map((s) => s.element as HTMLElement)
      .filter(
        (el) =>
          el.style.transform.includes('rotateZ') && !el.style.transform.includes('rotateZ(0deg)'),
      );
    // At least one non-active slide should have a nonzero rotateZ
    expect(nonActive.length).toBeGreaterThan(0);
    // With perSlideRotate=4 and progress=1 (prev slide), rotate=-4*1=-4 → rotateZ(-4deg)
    const hasLargerAngle = nonActive.some(
      (el) =>
        el.style.transform.includes('rotateZ(-4deg)') ||
        el.style.transform.includes('rotateZ(4deg)'),
    );
    expect(hasLargerAngle).toBe(true);
    wrapper.unmount();
  });

  it('unmount resets effectClasses and virtualTranslate', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCardsModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCards),
        ],
      },
    });
    await flushPromises();
    expect(host.effectClasses.value).toContain('v-surfer-cards');
    wrapper.unmount();
    await flushPromises();
    expect(host.effectClasses.value).toEqual([]);
    expect(host.virtualTranslate.value).toBe(false);
    expect(host.paramOverrides.value).toEqual({});
  });
});
