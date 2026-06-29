import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import Scrollbar, { ScrollbarModule } from '../../src/vue/modules/scrollbar';
import { useSurferHost } from '../../src/vue/module-host';

// Build the host (so a test can subscribe before mount) + a deferred mount. h(Scrollbar) is slot
// "chrome" rendered inside <KitSurfer>. The drag handlers bind to document (containerEl's doc).
function setup(hostExtra: Record<string, unknown> = {}, slideCount = 5) {
  const host = useSurferHost({
    slidesPerView: 1,
    spaceBetween: 0,
    modules: [ScrollbarModule],
    ...hostExtra,
  });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => [
          ...Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
          h(Scrollbar),
        ],
      },
    });
  return { host, doMount };
}

function down(el: Element, x = 10): void {
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: 10,
    }),
  );
}
function move(x: number): void {
  document.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 1, bubbles: true, clientX: x, clientY: 10 }),
  );
}
function up(x: number): void {
  document.dispatchEvent(
    new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: x, clientY: 10 }),
  );
}

describe('scrollbar drag events', () => {
  it('emits scrollbarDragStart/Move/End through a drag — on the host bus and the component, with the native event payload', async () => {
    const { host, doMount } = setup();
    const seen: string[] = [];
    host.on('scrollbarDragStart', () => seen.push('start'));
    host.on('scrollbarDragMove', () => seen.push('move'));
    host.on('scrollbarDragEnd', () => seen.push('end'));
    const wrapper = doMount();
    await flushPromises();

    const track = wrapper.find('.v-surfer-scrollbar').element;
    down(track);
    move(20);
    up(20);

    expect(seen).toEqual(['start', 'move', 'end']);

    const sb = wrapper.findComponent(Scrollbar);
    expect(sb.emitted('scrollbarDragStart')).toBeTruthy();
    expect(sb.emitted('scrollbarDragMove')).toBeTruthy();
    expect(sb.emitted('scrollbarDragEnd')).toBeTruthy();
    // payload is the native pointer event
    expect(sb.emitted('scrollbarDragStart')![0][0]).toBeInstanceOf(PointerEvent);

    wrapper.unmount();
    host.dispose();
  });

  it('does NOT surface scrollbar events on <KitSurfer> (component separation)', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const track = wrapper.find('.v-surfer-scrollbar').element;
    down(track);
    up(10);
    expect(wrapper.emitted('scrollbarDragStart')).toBeFalsy();
    expect(wrapper.emitted('scrollbarDragEnd')).toBeFalsy();
    wrapper.unmount();
    host.dispose();
  });
});
