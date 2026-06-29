import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferAutoplay, { AutoplayModule, type AutoplayApi } from '../../src/vue/modules/autoplay';
import { useSurferHost } from '../../src/vue/module-host';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(autoplayProps: Record<string, unknown> = {}, slideCount = 5) {
  const host = useSurferHost({ slidesPerView: 1, spaceBetween: 0, modules: [AutoplayModule] });
  const doMount = () =>
    mount(Surfer, {
      attachTo: document.body,
      props: { host },
      slots: {
        default: () => [
          ...Array.from({ length: slideCount }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferAutoplay, { delay: 100, ...autoplayProps }),
        ],
      },
    });
  return { host, doMount };
}

describe('autoplay events (frozen names, bus-routed)', () => {
  it('emits autoplayStart on begin and autoplay on an autoplay advance — on host.on and the component', async () => {
    const { host, doMount } = setup();
    const seen: string[] = [];
    host.on('autoplayStart', () => seen.push('autoplayStart'));
    host.on('autoplay', () => seen.push('autoplay'));
    const wrapper = doMount();
    await flushPromises();
    expect(seen).toContain('autoplayStart');
    await vi.advanceTimersByTimeAsync(120);
    await flushPromises();
    expect(seen).toContain('autoplay');
    const ap = wrapper.findComponent(SurferAutoplay);
    expect(ap.emitted('autoplayStart')).toBeTruthy();
    expect(ap.emitted('autoplay')).toBeTruthy();
    wrapper.unmount();
    host.dispose();
  });

  it('emits autoplayTimeLeft with a { timeLeft, percentage } object payload', async () => {
    const { host, doMount } = setup();
    const payloads: AutoplayApi['timeLeft'][] = [];
    let last: { timeLeft: number; percentage: number } | null = null;
    host.on('autoplayTimeLeft', (p) => {
      last = p as { timeLeft: number; percentage: number };
      payloads.push(last.timeLeft);
    });
    const wrapper = doMount();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(60);
    await flushPromises();
    expect(payloads.length).toBeGreaterThan(0);
    expect(last!.timeLeft).toBeGreaterThanOrEqual(0);
    expect(last!.percentage).toBeGreaterThanOrEqual(0);
    expect(last!.percentage).toBeLessThanOrEqual(1);
    wrapper.unmount();
    host.dispose();
  });

  it('does NOT surface autoplay events on <KitSurfer> (component separation)', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(120);
    await flushPromises();
    expect(wrapper.emitted('autoplayStart')).toBeFalsy();
    expect(wrapper.emitted('autoplay')).toBeFalsy();
    wrapper.unmount();
    host.dispose();
  });
});

describe('autoplay Api (host.modules.autoplay)', () => {
  it('exposes reactive running/paused and start/stop/pause/resume + autoplayStop on stop', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const ap = host.modules.autoplay as AutoplayApi;

    // Running after the initial begin().
    expect(ap.running).toBe(true);
    expect(ap.paused).toBe(false);

    // pause() → paused true + autoplayPause.
    const events: string[] = [];
    host.on('autoplayPause', () => events.push('pause'));
    host.on('autoplayResume', () => events.push('resume'));
    host.on('autoplayStop', () => events.push('stop'));
    ap.pause();
    await flushPromises();
    expect(ap.paused).toBe(true);
    expect(events).toContain('pause');

    // resume() → paused false + autoplayResume.
    ap.resume();
    await flushPromises();
    expect(ap.paused).toBe(false);
    expect(events).toContain('resume');

    // stop() → running false + autoplayStop.
    ap.stop();
    await flushPromises();
    expect(ap.running).toBe(false);
    expect(events).toContain('stop');

    wrapper.unmount();
    host.dispose();
  });

  it('timeLeft is a positive number while running and counts down over time', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const ap = host.modules.autoplay as AutoplayApi;
    await vi.advanceTimersByTimeAsync(10);
    await flushPromises();
    const first = ap.timeLeft;
    expect(first).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(40);
    await flushPromises();
    expect(ap.timeLeft).toBeLessThan(first);
    wrapper.unmount();
    host.dispose();
  });

  it('reports paused=true during the autoplay transition window (mirrors the controller)', async () => {
    const { host, doMount } = setup();
    const wrapper = doMount();
    await flushPromises();
    const ap = host.modules.autoplay as AutoplayApi;
    // Advance past the delay → an autoplay advance fires host.next(), entering the
    // waitForTransition window (transitionDuration > 0) where the controller is paused.
    await vi.advanceTimersByTimeAsync(120);
    await flushPromises();
    expect(ap.running).toBe(true);
    expect(ap.paused).toBe(true);
    wrapper.unmount();
    host.dispose();
  });
});
