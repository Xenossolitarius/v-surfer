import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import { useSurferHost } from '../../src/vue/module-host';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

describe('host event bus', () => {
  it('delivers coreEmit payloads to on() subscribers and stops after unsubscribe', () => {
    const host = useSurferHost({});
    const seen: unknown[] = [];
    const off = host.on('setTranslate', (p) => seen.push(p));
    host.coreEmit('setTranslate', 5);
    host.coreEmit('setTranslate', 9);
    off();
    host.coreEmit('setTranslate', 13);
    expect(seen).toEqual([5, 9]);
    host.dispose();
  });

  it('only fires the subscriber whose name matches', () => {
    const host = useSurferHost({});
    const seen: string[] = [];
    host.on('update', () => seen.push('update'));
    host.coreEmit('resize');
    host.coreEmit('update');
    expect(seen).toEqual(['update']);
    host.dispose();
  });

  it('clears listeners on dispose', () => {
    const host = useSurferHost({});
    const seen: string[] = [];
    host.on('update', () => seen.push('u'));
    host.dispose();
    host.coreEmit('update');
    expect(seen).toEqual([]);
  });

  it('bridges engine events to the bus', () => {
    const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    host.engine.setGeometry({ containerSize: 800 });
    host.engine.setSlides(Array.from({ length: 4 }, (_, i) => ({ data: i })));
    const seen: string[] = [];
    host.on('slideChange', () => seen.push('slideChange'));
    host.engine.slideTo(2);
    expect(seen).toContain('slideChange');
    host.dispose();
  });
});

describe('KitSurfer routes core events through the host bus', () => {
  it('fires host.on(touchStart) on a pointerdown (touch routed via the bus)', async () => {
    const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, threshold: 0 });
    const seen: string[] = [];
    host.on('touchStart', () => seen.push('touchStart'));
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
    });
    await flushPromises();
    wrapper.findAll('.v-surfer-slide')[0].element.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        bubbles: true,
        clientX: 200,
        clientY: 100,
      }),
    );
    expect(seen).toContain('touchStart');
    document.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 200, clientY: 100 }),
    );
    wrapper.unmount();
    host.dispose();
  });

  it('still surfaces a core event (slideChange) on the KitSurfer component', async () => {
    const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: { default: () => Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })) },
    });
    await flushPromises();
    host.engine.slideTo(1);
    await flushPromises();
    expect(wrapper.emitted('slideChange')).toBeTruthy();
    wrapper.unmount();
    host.dispose();
  });
});
