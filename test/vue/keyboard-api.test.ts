import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferKeyboard, { KeyboardModule, type KeyboardApi } from '../../src/vue/modules/keyboard';
import { useSurferHost } from '../../src/vue/module-host';

function setup(slideCount = 5) {
  const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, modules: [KeyboardModule] });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => [
          ...Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferKeyboard),
        ],
      },
    });
  return { host, doMount };
}

// A right-arrow keydown (keyCode 39) on the bound document.
const pressRight = (): void =>
  document.dispatchEvent(
    new KeyboardEvent('keydown', { keyCode: 39, bubbles: true } as KeyboardEventInit),
  );

describe('keyboard Api (host.modules.keyboard)', () => {
  it('exposes reactive enabled + enable/disable that gate key navigation', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const api = host.modules.keyboard as KeyboardApi;
    expect(api.enabled).toBe(true);

    pressRight();
    await flushPromises();
    expect(host.activeIndex.value).toBe(1);

    api.disable();
    await flushPromises();
    expect(api.enabled).toBe(false);
    pressRight();
    await flushPromises();
    expect(host.activeIndex.value).toBe(1); // disabled → no move

    api.enable();
    await flushPromises();
    pressRight();
    await flushPromises();
    expect(host.activeIndex.value).toBe(2); // re-enabled → moves

    wrapper.unmount();
    host.dispose();
  });
});

describe('keyboard keyPress event (bus-routed)', () => {
  it('emits keyPress with the keyCode on host.on and the component, not on <KitSurfer>', async () => {
    const { host, doMount } = setup();
    const seen: number[] = [];
    host.on('keyPress', (code) => seen.push(code as number));
    const wrapper = doMount();
    await flushPromises();
    pressRight();
    await flushPromises();
    expect(seen).toContain(39);
    const kb = wrapper.findComponent(SurferKeyboard);
    expect(kb.emitted('keyPress')).toBeTruthy();
    expect(wrapper.emitted('keyPress')).toBeFalsy(); // component separation
    wrapper.unmount();
    host.dispose();
  });
});
