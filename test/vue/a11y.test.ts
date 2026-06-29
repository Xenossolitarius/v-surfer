import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferA11y, { A11yModule } from '../../src/vue/modules/a11y';
import type { ModuleHost } from '../../src/vue/module-host';
import SurferNavigation, { NavigationModule } from '../../src/vue/modules/navigation';
import SurferPagination, { PaginationModule } from '../../src/vue/modules/pagination';

function mountA11yWithChrome(count = 5, a11yProps: Record<string, unknown> = {}) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [A11yModule, NavigationModule, PaginationModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferNavigation),
        h(SurferPagination, { type: 'bullets', clickable: true }),
        h(SurferA11y, a11yProps),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

function mountA11y(count = 5) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    attachTo: document.body,
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [A11yModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferA11y, { slideLabelMessage: '{{index}} / {{slidesLength}}' }),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('a11y module + <SurferA11y>', () => {
  it('sets a role on each slide and an aria-label from the slide-label template', async () => {
    const { wrapper } = mountA11y();
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides[0].attributes('role')).toBe('group');
    expect(slides[0].attributes('aria-label')).toBe('1 / 5');
  });

  it('renders a live region with the notification class', async () => {
    const { wrapper } = mountA11y();
    await flushPromises();
    expect(wrapper.find('.v-surfer-notification').exists()).toBe(true);
  });

  it('announces nextSlideMessage when navigating forward', async () => {
    const { wrapper, getHost } = mountA11y(5);
    await flushPromises();
    const host = getHost();
    host.goTo(1, { speed: 0 });
    await flushPromises();
    const liveRegion = wrapper.find('.v-surfer-notification');
    expect(liveRegion.element.textContent).toBe('Next slide');
  });

  it('announces lastSlideMessage when navigating to the last slide', async () => {
    const { wrapper, getHost } = mountA11y(5);
    await flushPromises();
    const host = getHost();
    host.goTo(4, { speed: 0 });
    await flushPromises();
    const liveRegion = wrapper.find('.v-surfer-notification');
    expect(liveRegion.element.textContent).toBe('This is the last slide');
  });

  it('announces prevSlideMessage when navigating backward from middle', async () => {
    const { wrapper, getHost } = mountA11y(5);
    await flushPromises();
    const host = getHost();
    // Go to slide 2 first, then back to slide 1
    host.goTo(2, { speed: 0 });
    await flushPromises();
    host.goTo(1, { speed: 0 });
    await flushPromises();
    const liveRegion = wrapper.find('.v-surfer-notification');
    expect(liveRegion.element.textContent).toBe('Previous slide');
  });

  it('announces firstSlideMessage when navigating back to the first slide', async () => {
    const { wrapper, getHost } = mountA11y(5);
    await flushPromises();
    const host = getHost();
    // Navigate forward first, then back to beginning
    host.goTo(1, { speed: 0 });
    await flushPromises();
    host.goTo(0, { speed: 0 });
    await flushPromises();
    const liveRegion = wrapper.find('.v-surfer-notification');
    expect(liveRegion.element.textContent).toBe('This is the first slide');
  });

  it('labels pagination bullets and mirrors the active bullet to aria-current', async () => {
    const { wrapper } = mountA11yWithChrome(5); // see helper below
    await flushPromises();
    const bullets = wrapper.findAll('.v-surfer-pagination-bullet');
    expect(bullets.length).toBe(5);
    expect(bullets[0].attributes('role')).toBe('button');
    expect(bullets[0].attributes('aria-label')).toBe('Go to slide 1');
    expect(bullets[0].attributes('aria-current')).toBe('true');
    expect(bullets[1].attributes('aria-current')).toBeUndefined();
    wrapper.unmount();
  });

  it('does NOT decorate pagination bullets when clickable is false (frozen parity)', async () => {
    // Frozen only adds role/aria-label/aria-current to bullets when pagination is
    // clickable (a11y.ts:206). The kit's a11y component can't see the pagination
    // module's config, so `clickable` is the channel for that fact.
    const { wrapper } = mountA11yWithChrome(5, { clickable: false });
    await flushPromises();
    const bullets = wrapper.findAll('.v-surfer-pagination-bullet');
    expect(bullets.length).toBe(5);
    expect(bullets[0].attributes('role')).toBeUndefined();
    expect(bullets[0].attributes('aria-label')).toBeUndefined();
    expect(bullets[0].attributes('aria-current')).toBeUndefined();
    wrapper.unmount();
  });

  it('Enter on the next button advances the engine and announces', async () => {
    const { wrapper, getHost } = mountA11yWithChrome(5);
    await flushPromises();
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;
    next.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: 13, bubbles: true } as KeyboardEventInit),
    );
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(1);
    expect(wrapper.find('.v-surfer-notification').element.textContent).toBe('Next slide');
    wrapper.unmount();
  });

  it('Enter on a bullet activates it', async () => {
    const { wrapper, getHost } = mountA11yWithChrome(5);
    await flushPromises();
    const bullet = wrapper.findAll('.v-surfer-pagination-bullet')[2].element as HTMLElement;
    bullet.dispatchEvent(
      new KeyboardEvent('keydown', { keyCode: 13, bubbles: true } as KeyboardEventInit),
    );
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(2);
    wrapper.unmount();
  });

  it('wrapper aria-live is polite by default', async () => {
    const { wrapper } = mountA11y();
    await flushPromises();
    expect(wrapper.find('.v-surfer-wrapper').attributes('aria-live')).toBe('polite');
  });

  it('sets container role + aria-label from containerRole/containerMessage', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [A11yModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferA11y, {
            containerRole: 'region',
            containerMessage: 'My carousel',
            containerRoleDescriptionMessage: 'carousel',
          }),
        ],
      },
    });
    await flushPromises();
    const container = wrapper.element as HTMLElement;
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('My carousel');
    expect(container.getAttribute('aria-roledescription')).toBe('carousel');
    wrapper.unmount();
    void host;
  });

  it('wrapper aria-live is off when autoplay is on', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [A11yModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferA11y, { autoplay: true }),
        ],
      },
    });
    await flushPromises();
    expect(wrapper.find('.v-surfer-wrapper').attributes('aria-live')).toBe('off');
    wrapper.unmount();
    void host;
  });
});

describe('a11y nav role + aria-label', () => {
  it('nav buttons have role=button and aria-label regardless of loop/rewind', async () => {
    const { wrapper } = mountA11yWithChrome(5);
    await flushPromises();

    const prev = wrapper.find('.v-surfer-button-prev').element as HTMLElement;
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;

    expect(prev.getAttribute('role')).toBe('button');
    expect(prev.getAttribute('aria-label')).toBe('Previous slide');
    expect(next.getAttribute('role')).toBe('button');
    expect(next.getAttribute('aria-label')).toBe('Next slide');

    wrapper.unmount();
  });

  it('nav buttons have role=button and aria-label under loop', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        modules: [A11yModule, NavigationModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferNavigation),
          h(SurferA11y),
        ],
      },
    });
    await flushPromises();

    const prev = wrapper.find('.v-surfer-button-prev').element as HTMLElement;
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;

    expect(prev.getAttribute('role')).toBe('button');
    expect(prev.getAttribute('aria-label')).toBe('Previous slide');
    expect(next.getAttribute('role')).toBe('button');
    expect(next.getAttribute('aria-label')).toBe('Next slide');

    wrapper.unmount();
    void host;
  });
});

describe('a11y nav aria-disabled toggling', () => {
  it('prev gets aria-disabled at beginning; next gets it at end', async () => {
    const { wrapper, getHost } = mountA11yWithChrome(5);
    await flushPromises();

    const prev = wrapper.find('.v-surfer-button-prev').element as HTMLElement;
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;

    // At the beginning: prev disabled, next not.
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(next.getAttribute('aria-disabled')).toBeNull();

    // Navigate to last slide.
    getHost().goTo(4, { speed: 0 });
    await flushPromises();

    // At the end: next disabled, prev not.
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(prev.getAttribute('aria-disabled')).toBeNull();

    wrapper.unmount();
  });

  it('nav buttons never get aria-disabled under loop', async () => {
    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        modules: [A11yModule, NavigationModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 5 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferNavigation),
          h(SurferA11y),
        ],
      },
    });
    await flushPromises();

    const prev = wrapper.find('.v-surfer-button-prev').element as HTMLElement;
    const next = wrapper.find('.v-surfer-button-next').element as HTMLElement;

    expect(prev.getAttribute('aria-disabled')).toBeNull();
    expect(next.getAttribute('aria-disabled')).toBeNull();

    wrapper.unmount();
    void host;
  });
});

describe('a11y enabled:false no-op', () => {
  it('no live region and no aria-label on slides when enabled is false', async () => {
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [A11yModule],
      },
      slots: {
        default: () => [
          ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferA11y, { enabled: false }),
        ],
      },
    });
    await flushPromises();

    expect(wrapper.find('.v-surfer-notification').exists()).toBe(false);
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides[0].attributes('aria-label')).toBeUndefined();

    wrapper.unmount();
  });
});

describe('a11y focus-to-slide (scrollOnFocus)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slides to a focused, non-active slide', async () => {
    vi.useFakeTimers();

    const { wrapper, getHost } = mountA11yWithChrome(4);
    await flushPromises();

    const host = getHost();

    // Advance past the 100ms visibility-change guard (set at mount time).
    vi.advanceTimersByTime(200);

    const slideEl = wrapper.findAll('.v-surfer-slide')[2].element as HTMLElement;
    slideEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));

    // The handler schedules inside requestAnimationFrame (shimmed as setTimeout in jsdom/happy-dom).
    vi.runAllTimers();

    expect(host.state.value.activeIndex).toBe(2);

    wrapper.unmount();
  });

  it('does not slide when focus follows a pointer click (clicked guard)', async () => {
    vi.useFakeTimers();

    const { wrapper, getHost } = mountA11yWithChrome(4);
    await flushPromises();

    const host = getHost();

    vi.advanceTimersByTime(200);

    // Simulate a pointer click on the container before the focus.
    const containerEl = host.containerEl.value!;
    containerEl.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    const slideEl = wrapper.findAll('.v-surfer-slide')[2].element as HTMLElement;
    slideEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));

    vi.runAllTimers();

    // Should remain at slide 0 because of the clicked guard.
    expect(host.state.value.activeIndex).toBe(0);

    wrapper.unmount();
  });

  it('does not slide for an already-active slide', async () => {
    vi.useFakeTimers();

    const { wrapper, getHost } = mountA11yWithChrome(4);
    await flushPromises();

    const host = getHost();

    vi.advanceTimersByTime(200);

    // Focus slide 0 which is already active.
    const slideEl = wrapper.findAll('.v-surfer-slide')[0].element as HTMLElement;
    slideEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));

    vi.runAllTimers();

    expect(host.state.value.activeIndex).toBe(0);

    wrapper.unmount();
  });

  it('scrollOnFocus:false disables the behavior', async () => {
    vi.useFakeTimers();

    let host: ModuleHost | null = null;
    const wrapper = mount(Surfer, {
      attachTo: document.body,
      props: {
        slidesPerView: 1,
        spaceBetween: 0,
        modules: [A11yModule],
        onReady: (h2: ModuleHost) => (host = h2),
      },
      slots: {
        default: () => [
          ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
          h(SurferA11y, { scrollOnFocus: false }),
        ],
      },
    });
    await flushPromises();

    vi.advanceTimersByTime(200);

    const slideEl = wrapper.findAll('.v-surfer-slide')[2].element as HTMLElement;
    slideEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));

    vi.runAllTimers();

    expect(host!.state.value.activeIndex).toBe(0);

    wrapper.unmount();
  });
});
