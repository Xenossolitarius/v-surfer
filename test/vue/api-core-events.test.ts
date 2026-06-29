import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h, ref } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { useSurferHost } from '../../src/vue/module-host';

describe('core events — lock / unlock', () => {
  it('emits lock/unlock on host.on and <KitSurfer> as content fit changes', async () => {
    const count = ref(4); // start unlocked (4 slides, 1-up)
    const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    const seen: string[] = [];
    host.on('lock', () => seen.push('lock'));
    host.on('unlock', () => seen.push('unlock'));
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => Array.from({ length: count.value }, (_, i) => h(Item, { data: i, key: i })),
      },
    });
    await flushPromises();
    expect(host.isLocked.value).toBe(false);
    expect(seen).not.toContain('lock'); // no spurious initial lock

    // Shrink to 1 slide → lock.
    count.value = 1;
    await flushPromises();
    expect(host.isLocked.value).toBe(true);
    expect(seen).toContain('lock');
    expect(wrapper.emitted('lock')).toBeTruthy();

    // Grow back → unlock.
    count.value = 4;
    await flushPromises();
    expect(seen).toContain('unlock');
    expect(wrapper.emitted('unlock')).toBeTruthy();

    wrapper.unmount();
    host.dispose();
  });
});

describe('core events — breakpoint', () => {
  it('emits breakpoint on host.on and <KitSurfer> when the active breakpoint changes', async () => {
    const host = useSurferHost({
      slidesPerView: 1,
      spaceBetween: 0,
      breakpoints: { '640': { slidesPerView: 2 } },
    });
    const seen: string[] = [];
    host.on('breakpoint', () => seen.push('breakpoint'));
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        host,
      },
      slots: { default: () => Array.from({ length: 6 }, (_, i) => h(Item, { data: i, key: i })) },
    });
    await flushPromises();

    // Drive the engine's breakpoint directly (the kit feeds dims via measure; here we exercise
    // the event path deterministically by setting breakpoint dimensions on the engine).
    host.engine.setBreakpointDimensions({ width: 700, height: 400 });
    await flushPromises();
    expect(host.state.value.breakpoint).toBe('640');
    expect(seen).toContain('breakpoint');
    expect(wrapper.emitted('breakpoint')).toBeTruthy();

    wrapper.unmount();
    host.dispose();
  });
});
