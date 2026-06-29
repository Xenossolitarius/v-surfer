import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { useSurferHost } from '../../src/vue/module-host';

function setup(params: Record<string, unknown> = {}, slideCount = 5) {
  const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, threshold: 0, ...params });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
      },
    });
  return { host, doMount };
}

describe('core methods — navigation', () => {
  it('slideToClosest snaps to the active slide and slideReset returns to activeIndex', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    host.goTo(2);
    await flushPromises();
    expect(host.activeIndex.value).toBe(2);
    host.slideReset();
    await flushPromises();
    expect(host.activeIndex.value).toBe(2);
    host.slideToClosest();
    await flushPromises();
    expect(host.activeIndex.value).toBe(2);
    wrapper.unmount();
    host.dispose();
  });

  it('slideToLoop targets the right realIndex under loop', async () => {
    const { host, doMount } = setup({ loop: true });
    const wrapper = doMount();
    await flushPromises();
    host.slideToLoop(3);
    await flushPromises();
    expect(host.realIndex.value).toBe(3);
    wrapper.unmount();
    host.dispose();
  });
});

describe('core methods — translate', () => {
  it('getTranslate reflects state.translate; min/maxTranslate equal the snapGrid bounds', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(host.getTranslate()).toBe(host.state.value.translate);
    const grid = host.state.value.snapGrid;
    expect(host.minTranslate()).toBe(grid[0] === 0 ? 0 : -grid[0]);
    expect(host.maxTranslate()).toBe(-grid[grid.length - 1]);
    wrapper.unmount();
    host.dispose();
  });

  it('setTranslate moves the wrapper instantly; translateTo sets a transition', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    host.setTranslate(-100);
    await flushPromises();
    expect(host.getTranslate()).toBe(-100);
    host.translateTo(-200, 300);
    await flushPromises();
    expect(host.getTranslate()).toBe(-200);
    wrapper.unmount();
    host.dispose();
  });

  it('setProgress free-scrubs to a fraction', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    host.setProgress(1);
    await flushPromises();
    expect(host.state.value.progress).toBeCloseTo(1, 5);
    wrapper.unmount();
    host.dispose();
  });
});

describe('core methods — control', () => {
  it('update() recomputes geometry after a direct param override', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const before = host.state.value.snapGrid.slice();
    host.paramOverrides.value = { ...host.paramOverrides.value, slidesPerView: 2 };
    await flushPromises();
    host.update();
    await flushPromises();
    // 2-up halves the per-step snap from the 1-up baseline.
    expect(host.state.value.snapGrid).not.toEqual(before);
    wrapper.unmount();
    host.dispose();
  });

  it('slidesPerViewDynamic() returns a number', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(typeof host.slidesPerViewDynamic()).toBe('number');
    expect(host.slidesPerViewDynamic('current', false)).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
    host.dispose();
  });

  it('setGrabCursor / unsetGrabCursor set and clear the wrapper cursor', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    host.setGrabCursor();
    expect(host.wrapperEl.value!.style.cursor).toBe('grab');
    host.unsetGrabCursor();
    expect(host.wrapperEl.value!.style.cursor).toBe('');
    wrapper.unmount();
    host.dispose();
  });

  it('updateSize/updateSlides/updateProgress/updateSlidesClasses/updateAutoHeight delegate to update without throwing', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(() => {
      host.updateSize();
      host.updateSlides();
      host.updateProgress();
      host.updateSlidesClasses();
      host.updateAutoHeight();
    }).not.toThrow();
    wrapper.unmount();
    host.dispose();
  });
});

describe('core methods — enable / disable', () => {
  it('exposes a reactive enabled flag toggled by enable()/disable()', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(host.enabled.value).toBe(true);
    host.disable();
    expect(host.enabled.value).toBe(false);
    host.enable();
    expect(host.enabled.value).toBe(true);
    wrapper.unmount();
    host.dispose();
  });

  it('disable() blocks a drag from starting; enable() restores it', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const container = wrapper.element as HTMLElement;

    const drag = async (): Promise<void> => {
      container.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 50, bubbles: true }),
      );
      document.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 50, bubbles: true }),
      );
      document.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 50, bubbles: true }),
      );
      await flushPromises();
    };

    host.disable();
    const translateBefore = host.getTranslate();
    await drag();
    expect(host.getTranslate()).toBe(translateBefore); // disabled → no movement

    host.enable();
    await drag();
    expect(host.getTranslate()).not.toBe(translateBefore); // enabled → drag moved the wrapper

    wrapper.unmount();
    host.dispose();
  });
});

describe('core methods — changeDirection', () => {
  it('flips state.layout.direction and the wrapper transform axis', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(host.state.value.layout.direction).toBe('horizontal');

    host.changeDirection('vertical');
    await flushPromises();
    expect(host.state.value.layout.direction).toBe('vertical');

    // After a move, a vertical layout translates on the Y axis.
    host.goTo(1);
    await flushPromises();
    const wrapperEl = wrapper.find('.v-surfer-wrapper').element as HTMLElement;
    expect(wrapperEl.style.transform).toMatch(/translate3d\(0px, -\d/);

    wrapper.unmount();
    host.dispose();
  });

  it('toggles direction when called with no argument', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    expect(host.state.value.layout.direction).toBe('horizontal');
    host.changeDirection();
    await flushPromises();
    expect(host.state.value.layout.direction).toBe('vertical');
    host.changeDirection();
    await flushPromises();
    expect(host.state.value.layout.direction).toBe('horizontal');
    wrapper.unmount();
    host.dispose();
  });
});
