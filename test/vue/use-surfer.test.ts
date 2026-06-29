import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h, defineComponent, computed } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { useSurfer } from '../../src/vue/module-host';
import { useSurferSlide } from '../../src/vue/slide-context';
import type { ModuleHost } from '../../src/vue/module-host';

// A descendant that reaches the host via the composable (not via onReady/prop).
const HostProbe = defineComponent({
  name: 'HostProbe',
  setup() {
    const host = useSurfer();
    return () => h('span', { class: 'host-probe' }, `active:${host.state.value.activeIndex}`);
  },
});

// A descendant of an <Item> slot that reads its own slide's reactive flags.
const SlideProbe = defineComponent({
  name: 'SlideProbe',
  setup() {
    const slide = useSurferSlide();
    const cls = computed(() => ({
      probe: true,
      active: slide.value.isActive,
      next: slide.value.isNext,
    }));
    return () => h('span', { class: cls.value }, `i${slide.value.index}`);
  },
});

function mountWithProbes(props: Record<string, unknown> = {}, count = 5) {
  return mount(Surfer, {
    props: { spaceBetween: 0, slidesPerView: 1, ...props },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) =>
          h(Item, { data: i, key: i }, { default: () => h(SlideProbe) }),
        ),
        // chrome (non-Item) descendant — exercises useSurfer() from within the tree.
        h(HostProbe),
      ],
    },
  });
}

describe('useSurfer()', () => {
  it('returns the same host instance a descendant would get from onReady', async () => {
    let ready: ModuleHost | null = null;
    const wrapper = mountWithProbes({ onReady: (h2: ModuleHost) => (ready = h2) });
    await flushPromises();
    // The probe rendered the host's activeIndex (0), proving it resolved the host.
    expect(wrapper.find('.host-probe').text()).toBe('active:0');
    // And it is the very same host object.
    ready!.next();
    await flushPromises();
    expect(wrapper.find('.host-probe').text()).toBe('active:1');
    wrapper.unmount();
  });

  it('throws when called outside a <Surfer>', () => {
    const Orphan = defineComponent({
      setup() {
        useSurfer();
        return () => h('div');
      },
    });
    expect(() => mount(Orphan)).toThrow();
  });
});

describe('useSurferSlide()', () => {
  it('gives each slide its own reactive flags', async () => {
    const wrapper = mountWithProbes({}, 5);
    await flushPromises();
    const probes = wrapper.findAll('.probe');
    expect(probes.length).toBe(5);
    // Slide 0 is active; with slidesPerView 1, slide 1 is next.
    expect(probes[0].classes()).toContain('active');
    expect(probes[1].classes()).not.toContain('active');
    expect(probes[1].classes()).toContain('next');
    wrapper.unmount();
  });

  it('updates the flags when the active slide changes', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountWithProbes({ onReady: (h2: ModuleHost) => (host = h2) }, 5);
    await flushPromises();
    host!.next();
    await flushPromises();
    const probes = wrapper.findAll('.probe');
    expect(probes[0].classes()).not.toContain('active');
    expect(probes[1].classes()).toContain('active');
    wrapper.unmount();
  });

  it('throws when called outside an <Item> slot', () => {
    const Orphan = defineComponent({
      setup() {
        useSurferSlide();
        return () => h('div');
      },
    });
    expect(() => mount(Orphan)).toThrow();
  });
});
