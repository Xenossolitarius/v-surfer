import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferMousewheel, {
  MousewheelModule,
  type MousewheelApi,
} from '../../src/vue/modules/mousewheel';
import { useSurferHost } from '../../src/vue/module-host';

function setup(slideCount = 5) {
  const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, modules: [MousewheelModule] });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => [
          ...Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferMousewheel),
        ],
      },
    });
  return { host, doMount };
}

const wheelDown = (el: Element): void =>
  el.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }));

describe('mousewheel Api (host.modules.mousewheel)', () => {
  it('exposes reactive enabled + enable/disable that gate wheel navigation', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const api = host.modules.mousewheel as MousewheelApi;
    expect(api.enabled).toBe(true);

    const container = wrapper.element as HTMLElement;
    wheelDown(container);
    await flushPromises();
    const movedTo = host.activeIndex.value;
    expect(movedTo).toBeGreaterThan(0); // wheel advanced

    api.disable();
    await flushPromises();
    expect(api.enabled).toBe(false);
    const before = host.activeIndex.value;
    wheelDown(container);
    await flushPromises();
    expect(host.activeIndex.value).toBe(before); // disabled → no move

    wrapper.unmount();
    host.dispose();
  });
});

describe('mousewheel scroll event (bus-routed)', () => {
  it('emits scroll with a WheelEvent on host.on and the component, not on <KitSurfer>', async () => {
    const { host, doMount } = setup();
    const seen: WheelEvent[] = [];
    host.on('scroll', (e) => seen.push(e as WheelEvent));
    const wrapper = doMount();
    await flushPromises();
    wheelDown(wrapper.element);
    await flushPromises();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBeInstanceOf(WheelEvent);
    const mw = wrapper.findComponent(SurferMousewheel);
    expect(mw.emitted('scroll')).toBeTruthy();
    expect(wrapper.emitted('scroll')).toBeFalsy(); // component separation
    wrapper.unmount();
    host.dispose();
  });
});
