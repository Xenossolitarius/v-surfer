import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h, ref, defineComponent } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

function mountSurfer(props: Record<string, unknown>, count = 5) {
  return mount(Surfer, {
    props: { spaceBetween: 0, ...props },
    slots: {
      default: () =>
        Array.from({ length: count }, (_, i) =>
          h(
            Item,
            { data: i, key: i },
            {
              default: ({ isActive }: { isActive: boolean }) =>
                h('div', { class: { on: isActive }, 'data-i': i }, `S${i}`),
            },
          ),
        ),
    },
  });
}

describe('<Surfer>', () => {
  it('renders harvested item templates and populates slideEls (no querySelector needed)', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountSurfer({ slidesPerView: 1, onReady: (h2: ModuleHost) => (host = h2) });
    await flushPromises();
    expect(wrapper.findAll('.v-surfer-slide').length).toBe(5);
    expect(wrapper.text()).toContain('S0');
    expect(host!.slideEls.value.length).toBe(5);
    expect(host!.slideEls.value.every((el) => el != null)).toBe(true);
    wrapper.unmount();
  });

  it('renders only the engine window under virtual', async () => {
    const wrapper = mountSurfer({ slidesPerView: 1, virtual: true }, 20);
    await flushPromises();
    // window at activeIndex 0, spv1 → from 0 to 1 → 2 slides, not 20
    expect(wrapper.findAll('.v-surfer-slide').length).toBe(2);
    wrapper.unmount();
  });

  it('reorders rendered realIndexes under loop after advancing', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountSurfer(
      { slidesPerView: 1, loop: true, onReady: (h2: ModuleHost) => (host = h2) },
      6,
    );
    await flushPromises();
    for (let i = 0; i < 4; i += 1) {
      host!.next({ speed: 0 });
      await flushPromises();
    }
    // active slide present; windowing/reorder keeps the set a permutation (no dupes)
    const ds = wrapper.findAll('.v-surfer-slide [data-i]').map((n) => n.attributes('data-i'));
    expect(new Set(ds).size).toBe(ds.length);
    expect(host!.state.value.activeIndex).toBeGreaterThanOrEqual(0);
    wrapper.unmount();
  });

  it('marks the active slide via the flag passed to the item slot', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountSurfer({ slidesPerView: 1, onReady: (h2: ModuleHost) => (host = h2) });
    await flushPromises();
    host!.goTo(2, { speed: 0 });
    await flushPromises();
    expect(wrapper.find('[data-i="2"]').classes()).toContain('on');
    wrapper.unmount();
  });

  it('reactively updates slides when the v-for source changes after mount', async () => {
    let host: ModuleHost | null = null;
    const items = ref([0, 1, 2]);

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(
            Surfer,
            {
              slidesPerView: 1,
              spaceBetween: 0,
              onReady: (h2: ModuleHost) => {
                host = h2;
              },
            },
            {
              default: () =>
                items.value.map((i) =>
                  h(
                    Item,
                    { data: i, key: i },
                    {
                      default: ({ isActive }: { isActive: boolean }) =>
                        h('div', { class: { on: isActive }, 'data-i': i }, `S${i}`),
                    },
                  ),
                ),
            },
          );
      },
    });

    const wrapper = mount(Wrapper);
    await flushPromises();

    expect(wrapper.findAll('.v-surfer-slide').length).toBe(3);
    expect(host!.slideEls.value.length).toBe(3);

    // Add 2 more items — the watchEffect harvest + flush:'post' watch must propagate
    items.value.push(3, 4);
    await flushPromises();

    expect(wrapper.findAll('.v-surfer-slide').length).toBe(5);
    expect(host!.slideEls.value.length).toBe(5);
    expect(host!.state.value.slides.length).toBe(5);

    wrapper.unmount();
  });

  // initialSlide is a newly-exposed pass-through param. The engine seeds activeIndex
  // from it at construction (engine.ts: `activeIndex = params.initialSlide`), so a
  // correct initial activeIndex proves the prop reached the engine via the auto-derived
  // ENGINE_KEYS — geometry-free, unlike most other new params.
  it('forwards initialSlide through to the engine (seeds activeIndex)', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mountSurfer(
      { slidesPerView: 1, initialSlide: 3, onReady: (h2: ModuleHost) => (host = h2) },
      5,
    );
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(3);
    wrapper.unmount();
  });

  // The newly-added engine params must be DECLARED props so Vue consumes them and
  // forwards them to the engine. An undeclared prop would instead fall through onto the
  // container as a DOM attribute (inheritAttrs default). Asserting none of them appear as
  // attributes proves the whole batch is declared (and thus wired into ENGINE_KEYS).
  it('declares the new engine params as props (they do not fall through as DOM attributes)', async () => {
    const params = {
      slidesPerGroupAuto: true,
      freeModeSticky: true,
      freeModeMomentumBounce: true,
      threshold: 5,
      touchRatio: 0.5,
      resistance: false,
      longSwipes: false,
      slidesPerGroupSkip: 1,
      followFinger: false,
    };
    const wrapper = mountSurfer({ slidesPerView: 1, ...params }, 5);
    await flushPromises();
    const attrs = wrapper.attributes();
    const present = Object.keys(attrs).map((k) => k.toLowerCase());
    for (const name of Object.keys(params)) {
      expect(present).not.toContain(name.toLowerCase());
    }
    wrapper.unmount();
  });

  it('applies a breakpoint resolved from the measured container width on mount', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1, // base
        spaceBetween: 0,
        breakpoints: { 640: { slidesPerView: 2 } },
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
      },
    });
    await flushPromises();
    // 800px container, breakpoint slidesPerView:2, gap 0 → each slide 400px.
    expect(host!.state.value.slidesSizesGrid[0]).toBe(400);
    wrapper.unmount();
  });

  it('passes each Item data to its slot (headless { slide } parity)', async () => {
    // Stable data identities (hoisted, not fresh object literals per render) so the
    // harvest -> setSlides identity guard no-ops after the first render. Inline
    // `{ label }` literals recreated each render would defeat the guard and recurse
    // ("Maximum recursive updates"); real consumers pass a stable/reactive list.
    const data = [{ label: 'D0' }, { label: 'D1' }, { label: 'D2' }];
    const wrapper = mount(Surfer, {
      props: { slidesPerView: 1, spaceBetween: 0 },
      slots: {
        default: () =>
          data.map((d, i) =>
            h(
              Item,
              { data: d, key: i },
              {
                // read data from the slot arg, NOT closure, to prove it is passed through
                default: (flags: { data?: { label: string } }) =>
                  h('div', { 'data-from-slot': true }, String(flags.data?.label)),
              },
            ),
          ),
      },
    });
    await flushPromises();
    expect(wrapper.find('[data-from-slot]').text()).toBe('D0');
    wrapper.unmount();
  });
});
