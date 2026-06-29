import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { useSurferHost, type ModuleHost } from '../../src/vue/module-host';
import SurferController, { ControllerModule } from '../../src/vue/modules/controller';

/** Seed a standalone ModuleHost with 5 slides and a 800px container. */
function seedHost(host: ReturnType<typeof useSurferHost>) {
  host.engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
  host.engine.setGeometry({ containerSize: 800 });
}

describe('controller module + <SurferController>', () => {
  it('driving the source host moves the controlled target', async () => {
    // target is a standalone host; source is a mounted <Surfer> controlling it.
    const target = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    target.engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));
    target.engine.setGeometry({ containerSize: 800 });

    let source: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [ControllerModule],
        onReady: (h2: ModuleHost) => (source = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferController, { control: target }),
        ],
      },
    });
    await flushPromises();
    source!.goTo(3, { speed: 0 });
    await flushPromises();
    expect(target.state.value.activeIndex).toBe(3);
    wrapper.unmount();
    target.dispose();
  });

  it('twoWay: moving the target also moves the source, and source still drives target', async () => {
    const target = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    seedHost(target);

    let source: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [ControllerModule],
        onReady: (h2: ModuleHost) => (source = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferController, { control: target, twoWay: true }),
        ],
      },
    });
    await flushPromises();

    // Reverse direction: drive target → source should follow.
    target.goTo(2, { speed: 0 });
    await flushPromises();
    expect(source!.state.value.activeIndex).toBe(2);

    // Forward direction: drive source → target should follow (no infinite loop).
    source!.goTo(1, { speed: 0 });
    await flushPromises();
    expect(target.state.value.activeIndex).toBe(1);

    wrapper.unmount();
    target.dispose();
  });

  it('teardown: after unmount, source changes no longer drive the target', async () => {
    const target = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    seedHost(target);

    let source: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [ControllerModule],
        onReady: (h2: ModuleHost) => (source = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferController, { control: target }),
        ],
      },
    });
    await flushPromises();

    // Confirm link is live before unmount.
    source!.goTo(3, { speed: 0 });
    await flushPromises();
    expect(target.state.value.activeIndex).toBe(3);

    // Capture the source host before unmount, then unmount.
    const capturedSource = source!;
    wrapper.unmount();

    // Drive the source engine directly after unmount; link should be torn down.
    capturedSource.engine.slideTo(4, { speed: 0 });
    await flushPromises();

    // Target must stay at its pre-unmount index (3), not follow to 4.
    expect(target.state.value.activeIndex).toBe(3);

    target.dispose();
  });

  it('enabled:false: no link is established; target stays at 0', async () => {
    const target = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    seedHost(target);

    let source: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [ControllerModule],
        onReady: (h2: ModuleHost) => (source = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferController, { control: target, enabled: false }),
        ],
      },
    });
    await flushPromises();

    source!.goTo(3, { speed: 0 });
    await flushPromises();

    // No link: target must remain at its initial index.
    expect(target.state.value.activeIndex).toBe(0);

    wrapper.unmount();
    target.dispose();
  });

  it('links one source to MULTIPLE targets (array control)', async () => {
    // Build two standalone target hosts and a source host with the controller module.
    const targetA = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    const targetB = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    for (const h2 of [targetA, targetB])
      h2.engine.setSlides(Array.from({ length: 5 }, (_, i) => ({ data: i })));

    let source: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [ControllerModule],
        onReady: (h2: ModuleHost) => (source = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferController, { control: [targetA, targetB] }),
        ],
      },
    });
    await flushPromises();
    source!.engine.setGeometry({ containerSize: 800 });
    targetA.engine.setGeometry({ containerSize: 800 });
    targetB.engine.setGeometry({ containerSize: 800 });

    source!.engine.slideTo(2, { speed: 0 });
    await flushPromises();
    expect(targetA.engine.state.activeIndex).toBe(2);
    expect(targetB.engine.state.activeIndex).toBe(2);

    wrapper.unmount();
    source!.engine.slideTo(1, { speed: 0 });
    await flushPromises();
    // after unmount, neither target follows
    expect(targetA.engine.state.activeIndex).toBe(2);
    expect(targetB.engine.state.activeIndex).toBe(2);
    targetA.dispose();
    targetB.dispose();
  });
});
