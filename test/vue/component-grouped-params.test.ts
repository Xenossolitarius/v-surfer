import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

// Mount KitSurfer, capture the host it builds via onReady, return engine params.
async function paramsOf(props: Record<string, unknown>) {
  let host: ModuleHost | undefined;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      onReady: (h: ModuleHost) => {
        host = h;
      },
      ...props,
    },
    slots: { default: () => Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })) },
  });
  await flushPromises();
  const params = host!.engine.params;
  wrapper.unmount();
  return params;
}

describe('KitSurfer accepts grouped engine-param props (coexist with flat, flat wins)', () => {
  it('loop object → loop + flat sub-fields', async () => {
    const p = await paramsOf({ loop: { additionalSlides: 2, preventsSliding: false } });
    expect(p.loop).toBe(true);
    expect(p.loopAdditionalSlides).toBe(2);
    expect(p.loopPreventsSliding).toBe(false);
  });

  it('freeMode object → freeMode + momentum/sticky fields', async () => {
    const p = await paramsOf({ freeMode: { sticky: true, momentumRatio: 0.5 } });
    expect(p.freeMode).toBe(true);
    expect(p.freeModeSticky).toBe(true);
    expect(p.freeModeMomentumRatio).toBe(0.5);
  });

  it('virtual object → virtual + addSlidesBefore/autoSlidesPerView', async () => {
    const p = await paramsOf({ virtual: { addSlidesBefore: 1, autoSlidesPerView: 3 } });
    expect(p.virtual).toBe(true);
    expect(p.addSlidesBefore).toBe(1);
    expect(p.virtualAutoSlidesPerView).toBe(3);
  });

  it('centered object → centeredSlides + insufficientSlides', async () => {
    const p = await paramsOf({ centered: { insufficientSlides: true } });
    expect(p.centeredSlides).toBe(true);
    expect(p.centerInsufficientSlides).toBe(true);
  });

  it('group object → slidesPerGroup/skip/auto', async () => {
    const p = await paramsOf({ group: { perGroup: 2, skip: 1, auto: true } });
    expect(p.slidesPerGroup).toBe(2);
    expect(p.slidesPerGroupSkip).toBe(1);
    expect(p.slidesPerGroupAuto).toBe(true);
  });

  it('touch object → allowTouchMove/ratio/threshold/etc', async () => {
    const p = await paramsOf({
      touch: { allow: false, ratio: 2, threshold: 8, followFinger: false },
    });
    expect(p.allowTouchMove).toBe(false);
    expect(p.touchRatio).toBe(2);
    expect(p.threshold).toBe(8);
    expect(p.followFinger).toBe(false);
  });

  it('a bare boolean / {} group is the enabled shorthand', async () => {
    expect((await paramsOf({ loop: {} })).loop).toBe(true);
    expect((await paramsOf({ centered: true })).centeredSlides).toBe(true);
    expect((await paramsOf({ freeMode: { enabled: false, sticky: true } })).freeMode).toBe(false);
  });

  it('still accepts the flat form (back-compat)', async () => {
    const p = await paramsOf({ loop: true, loopAdditionalSlides: 3, freeModeSticky: true });
    expect(p.loop).toBe(true);
    expect(p.loopAdditionalSlides).toBe(3);
    expect(p.freeModeSticky).toBe(true);
  });

  it('an explicit flat prop wins over a nested-derived one', async () => {
    const p = await paramsOf({ touch: { threshold: 8 }, threshold: 99 });
    expect(p.threshold).toBe(99);
  });
});
