import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferAutoplay, { AutoplayModule } from '../../src/vue/modules/autoplay';
import type { ModuleHost } from '../../src/vue/module-host';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('autoplay module + <SurferAutoplay>', () => {
  it('advances on the delay interval and emits timeLeft with a 0..1 progress', async () => {
    let host: ModuleHost | null = null;
    const timeLeft: Array<[number, number]> = [];
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, {
            delay: 100,
            onAutoplayTimeLeft: (p: { timeLeft: number; percentage: number }) =>
              timeLeft.push([p.timeLeft, p.percentage]),
          }),
        ],
      },
    });
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(0);
    await vi.advanceTimersByTimeAsync(120);
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(1);
    expect(timeLeft.length).toBeGreaterThan(0);
    const [, progress] = timeLeft[0];
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
    wrapper.unmount();
  });

  it('wraps to 0 at the end when stopOnLastSlide is false', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        // Start at last slide so the engine is already at slide 4 when autoplay mounts.
        // Using initialSlide mirrors the headless test's pre-mount engine.slideTo(4).
        initialSlide: 4,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000, stopOnLastSlide: false }),
        ],
      },
    });
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(4);

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    // Should wrap to 0
    expect(host!.state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('stops at the last slide when stopOnLastSlide is true', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        // Start at last slide so the engine is already at slide 4 when autoplay mounts.
        // Using initialSlide mirrors the headless test's pre-mount engine.slideTo(4).
        initialSlide: 4,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000, stopOnLastSlide: true }),
        ],
      },
    });
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(4);

    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();
    // Should remain at last slide
    expect(host!.state.value.activeIndex).toBe(4);
    wrapper.unmount();
  });

  it('does not advance when enabled is false', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000, enabled: false }),
        ],
      },
    });
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(0);

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    // Should not advance
    expect(host!.state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('stops ticking after unmount', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000 }),
        ],
      },
    });
    await flushPromises();
    wrapper.unmount();

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    // Should not advance after unmount
    expect(host!.state.value.activeIndex).toBe(0);
  });

  it('pauses on user drag (touching) with disableOnInteraction → stop', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000, disableOnInteraction: true }),
        ],
      },
    });
    await flushPromises();

    // simulate a drag start: the engine sets touching=true on pointerStart
    host!.engine.pointerStart({ x: 0, y: 0, time: 0 });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();

    // stopped → no advance even after the drag ends
    host!.engine.pointerEnd({ x: 0, y: 0, time: 0 });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();

    expect(host!.state.value.activeIndex).toBe(0);
    wrapper.unmount();
  });

  it('does not resume on pointerleave while a drag is still in progress', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000, pauseOnMouseEnter: true }),
        ],
      },
    });
    await flushPromises();

    const containerEl = host!.containerEl.value!;

    // Mouse over the slides → pause; then start dragging.
    containerEl.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse', bubbles: true }),
    );
    await flushPromises();
    host!.engine.pointerStart({ x: 0, y: 0, time: 0 });
    await flushPromises();

    // Cursor leaves the host while STILL dragging — must NOT resume the countdown.
    containerEl.dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse', bubbles: true }),
    );
    await flushPromises();

    await vi.advanceTimersByTimeAsync(3000);
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(0); // bug would have resumed and advanced

    // Releasing the drag (outside the host) resumes; then it advances on the next delay.
    host!.engine.pointerEnd({ x: 0, y: 0, time: 0 });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(1);
    wrapper.unmount();
  });

  it('holds the full delay during the post-slide transition window (timeLeft != 0 mid-transition)', async () => {
    // speed>0 → waitForTransition opens a transition window after each advance.
    let host: ModuleHost | null = null;
    let lastTl = -1;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 400,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, {
            delay: 2000,
            onAutoplayTimeLeft: (p: { timeLeft: number; percentage: number }) =>
              (lastTl = p.timeLeft),
          }),
        ],
      },
    });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(2000); // fires → idx 1, now inside the 400ms transition window
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(1);

    await vi.advanceTimersByTimeAsync(100); // sample the timer mid-transition
    await flushPromises();
    // Bug 1: the timer must NOT read 0 ("all time passed") during the transition —
    // it holds the upcoming full delay, matching frozen's reset-pause.
    expect(lastTl).toBe(2000);
    wrapper.unmount();
  });

  it('hovering during the transition window does not cause an extra advance', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 400,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 2000, pauseOnMouseEnter: true }),
        ],
      },
    });
    await flushPromises();

    const containerEl = host!.containerEl.value!;

    await vi.advanceTimersByTimeAsync(2000); // fires → idx 1, inside the transition window
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(1);

    // Bug 2: hover in/out while the slide is still transitioning must not slide again.
    await vi.advanceTimersByTimeAsync(100);
    await flushPromises();
    containerEl.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse', bubbles: true }),
    );
    await flushPromises();
    await vi.advanceTimersByTimeAsync(50);
    await flushPromises();
    containerEl.dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse', bubbles: true }),
    );
    await flushPromises();
    await vi.advanceTimersByTimeAsync(50); // let the transition settle
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(1); // no extra advance

    // and it still advances normally one full delay after resuming
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(2);
    wrapper.unmount();
  });

  it('clicking repeatedly while hovering does not lower the frozen timer', async () => {
    let host: ModuleHost | null = null;
    let lastTl = -1;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, {
            delay: 2000,
            pauseOnMouseEnter: true,
            onAutoplayTimeLeft: (p: { timeLeft: number; percentage: number }) =>
              (lastTl = p.timeLeft),
          }),
        ],
      },
    });
    await flushPromises();

    const containerEl = host!.containerEl.value!;

    await vi.advanceTimersByTimeAsync(600); // remaining 1400
    await flushPromises();
    containerEl.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse', bubbles: true }),
    ); // pause @1400
    await flushPromises();

    // Click (tap) several times while hovering, with wall-clock time passing between.
    for (let i = 0; i < 5; i += 1) {
      host!.engine.pointerStart({ x: 0, y: 0, time: 0 });
      await flushPromises();
      await vi.advanceTimersByTimeAsync(100);
      await flushPromises();
      host!.engine.pointerEnd({ x: 0, y: 0, time: 0 });
      await flushPromises();
      await vi.advanceTimersByTimeAsync(100);
      await flushPromises();
    }

    // Still hovering → still paused, and the remaining must stay frozen at 1400.
    expect(lastTl).toBe(1400);
    wrapper.unmount();
  });

  it('external navigation pauses autoplay (disableOnInteraction default false → reset pause)', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [AutoplayModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 1000 }),
        ],
      },
    });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(500);
    await flushPromises();
    host!.engine.slideTo(3, { speed: 0 }); // external nav at t=500
    await flushPromises();

    // paused; a further 600ms (would have been the original tick) does NOT advance
    await vi.advanceTimersByTimeAsync(600);
    await flushPromises();
    expect(host!.state.value.activeIndex).toBe(3);
    wrapper.unmount();
  });
});
