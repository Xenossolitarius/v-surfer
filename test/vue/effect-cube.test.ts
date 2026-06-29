import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectCubeModule } from '../../src/vue/effects/cube';
import KitEffectCube from '../../src/vue/effects/cube';

function mountCube(cubeConfig?: { shadow?: boolean; slideShadows?: boolean }) {
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      modules: [EffectCubeModule],
      config: cubeConfig !== undefined ? { cube: cubeConfig } : {},
    },
    slots: {
      default: () => [
        ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
        h(KitEffectCube),
      ],
    },
  });
  return { wrapper };
}

describe('cube effect (module + component)', () => {
  it('adds v-surfer-cube and v-surfer-3d classes to the container', async () => {
    const { wrapper } = mountCube();
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.classList.contains('v-surfer-cube')).toBe(true);
    expect(container.classList.contains('v-surfer-3d')).toBe(true);
    wrapper.unmount();
  });

  it('wrapper carries a rotateX/rotateY transform and transformOrigin after mount', async () => {
    const { wrapper } = mountCube();
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector<HTMLElement>('.v-surfer-wrapper');
    expect(wrapperEl).toBeTruthy();
    expect(wrapperEl!.style.transform).toMatch(/rotateX|rotateY/);
    expect(wrapperEl!.style.transformOrigin).toMatch(/50% 50% -/);
    wrapper.unmount();
  });

  it('CSS var --v-surfer-cube-translate-z is set on the wrapper', async () => {
    const { wrapper } = mountCube();
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector<HTMLElement>('.v-surfer-wrapper');
    expect(wrapperEl!.style.getPropertyValue('--v-surfer-cube-translate-z')).toBe('0px');
    wrapper.unmount();
  });

  it('each slide has a face transform with rotateX/rotateY', async () => {
    const { wrapper } = mountCube();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(4);
    for (const slide of slides) {
      const el = slide.element as HTMLElement;
      expect(el.style.transform).toMatch(/rotateX|rotateY/);
    }
    wrapper.unmount();
  });

  it('slideShadows:true (default) injects .v-surfer-slide-shadow-cube on each slide', async () => {
    const { wrapper } = mountCube({ slideShadows: true, shadow: false });
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBe(4);
    for (const slide of slides) {
      const shadowEls = slide.element.querySelectorAll('.v-surfer-slide-shadow-cube');
      expect(shadowEls.length).toBeGreaterThan(0);
    }
    wrapper.unmount();
  });

  it('slideShadows:false injects no .v-surfer-slide-shadow-cube children', async () => {
    const { wrapper } = mountCube({ slideShadows: false, shadow: false });
    await flushPromises();
    const shadowEls = wrapper.element.querySelectorAll('.v-surfer-slide-shadow-cube');
    expect(shadowEls.length).toBe(0);
    wrapper.unmount();
  });

  it('shadow:true (default) appends a .v-surfer-cube-shadow element to the wrapper (horizontal)', async () => {
    const { wrapper } = mountCube({ shadow: true });
    await flushPromises();
    const wrapperEl = wrapper.element.querySelector<HTMLElement>('.v-surfer-wrapper');
    const shadowEl = wrapperEl?.querySelector('.v-surfer-cube-shadow');
    expect(shadowEl).toBeTruthy();
    wrapper.unmount();
  });

  it('shadow:false does not inject .v-surfer-cube-shadow', async () => {
    const { wrapper } = mountCube({ shadow: false });
    await flushPromises();
    const shadowEl = wrapper.element.querySelector('.v-surfer-cube-shadow');
    expect(shadowEl).toBeNull();
    wrapper.unmount();
  });

  it('forces slidesPerView:1 via paramOverrides (slidesSizesGrid[0] == container width)', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCubeModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCube),
        ],
      },
    });
    await flushPromises();
    expect(host.state.value.slidesSizesGrid[0]).toBe(800);
    wrapper.unmount();
  });

  it('unmount cleans up: effectClasses, virtualTranslate, and wrapper styles reset', async () => {
    let host: any = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        modules: [EffectCubeModule],
        config: {},
        onReady: (h2: any) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(KitEffectCube),
        ],
      },
    });
    await flushPromises();
    expect(host.effectClasses.value).toContain('v-surfer-cube');
    wrapper.unmount();
    await flushPromises();
    // After unmount, all reactive state should be reset
    expect(host.effectClasses.value).toEqual([]);
    expect(host.virtualTranslate.value).toBe(false);
    expect(host.paramOverrides.value).toEqual({});
    // Check that the wrapper element reference was captured and its styles were cleared
    const wrapperEl = host.wrapperEl.value;
    if (wrapperEl) {
      expect(wrapperEl.style.transform).toBe('');
      expect(wrapperEl.style.transformOrigin).toBe('');
    }
  });
});
