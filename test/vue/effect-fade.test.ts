import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectFadeModule } from '../../src/vue/effects/fade';
import KitEffectFade from '../../src/vue/effects/fade';
import type { ModuleHost } from '../../src/vue/module-host';

function mountFade(crossFade = false) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectFadeModule],
      config: { fade: { crossFade } },
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectFade),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('fade effect (module + component)', () => {
  it('adds v-surfer-fade class to the container', async () => {
    const { wrapper } = mountFade();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-fade')).toBe(true);
    wrapper.unmount();
  });

  it('drops the wrapper transform (virtualTranslate)', async () => {
    const { wrapper } = mountFade();
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector('.v-surfer-wrapper') as HTMLElement;
    expect(wrapperEl.style.transform).toBe('');
    wrapper.unmount();
  });

  it('sets inline opacity on each slide', async () => {
    const { wrapper } = mountFade();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(3);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.opacity).not.toBe('');
    }
    wrapper.unmount();
  });

  it('forces slidesPerView:1 via paramOverrides (slidesSizesGrid[0] = container width)', async () => {
    const { wrapper, getHost } = mountFade();
    await flushPromises();
    // happy-dom container width is 800 by default
    const host = getHost();
    expect(host.state.value.slidesSizesGrid[0]).toBe(800);
    wrapper.unmount();
  });

  it('crossFade opacity: active slide has opacity 1', async () => {
    const { wrapper } = mountFade(true);
    await flushPromises();
    const activeSlide = wrapper.find('.v-surfer-slide-active').element as HTMLElement;
    expect(Number(activeSlide.style.opacity)).toBeCloseTo(1);
    wrapper.unmount();
  });
});
