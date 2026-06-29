import { describe, it, expect } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferPagination, { PaginationModule } from '../../src/vue/modules/pagination';

function ssrWith(props: Record<string, unknown>, count: number): Promise<string> {
  const App = defineComponent({
    render() {
      return h(
        Surfer,
        { slidesPerView: 1, spaceBetween: 0, ...props },
        {
          default: () =>
            Array.from({ length: count }, (_, i) =>
              h(Item, { data: i, key: i }, { default: () => h('div', `S${i}`) }),
            ),
        },
      );
    },
  });
  return renderToString(createSSRApp(App));
}

function ssr(count: number): Promise<string> {
  return ssrWith({}, count);
}

// Which slide contents (S0..S{count-1}) made it into the server markup.
function renderedSlides(html: string, count: number): number[] {
  const present: number[] = [];
  for (let i = 0; i < count; i += 1) if (html.includes(`>S${i}<`)) present.push(i);
  return present;
}

describe('KitSurfer SSR', () => {
  it('renders the slides server-side with the DOM-free class subset', async () => {
    const html = await ssr(4);
    // count: all slides present server-side
    expect((html.match(/v-surfer-slide/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // container classes (param-derived, DOM-free)
    expect(html).toContain('v-surfer-horizontal');
    // active class on the initial slide (DOM-free: activeIndex = initialSlide)
    expect(html).toContain('v-surfer-slide-active');
    // geometry-dependent classes are NOT present pre-measurement
    expect(html).not.toContain('v-surfer-slide-visible');
  });

  it('renders zero data loss: N items -> N slide nodes', async () => {
    const html = await ssr(6);
    // each Item's content S0..S5 made it into the server markup
    for (let i = 0; i < 6; i += 1) expect(html).toContain(`S${i}`);
  });
});

// SSR is DOM-free: there is no measurement on the server, so geometry-dependent
// state (slide sizes, the v-surfer-slide-visible class, loop rotation — which needs
// slidesGrid) is absent. These tests pin what virtual / loop / virtual+loop emit on
// the server so the markup is well-formed and hydration-stable (the client's first,
// pre-measurement render produces the same window).
describe('KitSurfer SSR — virtual / loop combinations', () => {
  it('virtual only: renders just the active window, with the v-surfer-virtual class', async () => {
    const html = await ssrWith({ virtual: true }, 8);
    expect(html).toContain('v-surfer-virtual'); // container modifier class present
    expect(html).toContain('v-surfer-slide-active'); // active = initialSlide 0
    expect(html).not.toContain('v-surfer-slide-visible'); // no geometry on the server
    // spv:1 window at activeIndex 0 → from 0, to 1 → exactly S0,S1 (NOT all 8)
    expect(renderedSlides(html, 8)).toEqual([0, 1]);
  });

  it('loop only: renders all slides in identity order (no rotation without geometry)', async () => {
    const html = await ssrWith({ loop: true }, 8);
    expect(html).not.toContain('v-surfer-virtual');
    expect(html).toContain('v-surfer-slide-active');
    expect(html).not.toContain('v-surfer-slide-visible');
    // loop rotation needs slidesGrid (measured), so the server emits the full set in order
    expect(renderedSlides(html, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('virtual + loop: renders the active window with the v-surfer-virtual class', async () => {
    const html = await ssrWith({ virtual: true, loop: true }, 8);
    expect(html).toContain('v-surfer-virtual');
    expect(html).toContain('v-surfer-slide-active');
    expect(html).not.toContain('v-surfer-slide-visible');
    // loopOrder is identity pre-measurement; spv:1 window at active 0 → S0,S1
    expect(renderedSlides(html, 8)).toEqual([0, 1]);
  });

  it('auto + virtual: virtualAutoSlidesPerView widens the SSR window to the estimate', async () => {
    // slidesPerView:'auto' has no measured size on the server, so the window would default to
    // 2 slides. The consumer's estimate (3) is forwarded to the engine and sizes the window
    // without measurement: from 0, to 3 → S0..S3.
    const html = await ssrWith(
      { virtual: true, slidesPerView: 'auto', virtualAutoSlidesPerView: 3 },
      8,
    );
    expect(html).toContain('v-surfer-virtual');
    expect(renderedSlides(html, 8)).toEqual([0, 1, 2, 3]);
  });

  it('all three combinations resolve to non-empty markup (SSR does not throw)', async () => {
    for (const props of [{ virtual: true }, { loop: true }, { virtual: true, loop: true }]) {
      const html = await ssrWith(props, 8);
      expect(html).toContain('v-surfer-wrapper');
      expect(html.length).toBeGreaterThan(0);
    }
  });
});

describe('KitSurfer SSR — pagination', () => {
  it('renders bullets server-side without throwing', async () => {
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [PaginationModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferPagination),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-pagination');
  });
});

describe('KitSurfer SSR — scrollbar', () => {
  it('renders scrollbar server-side without throwing (no window/document access)', async () => {
    const { default: SurferScrollbar, ScrollbarModule } =
      await import('../../src/vue/modules/scrollbar');
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [ScrollbarModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferScrollbar),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-scrollbar');
  });
});

describe('KitSurfer SSR — keyboard', () => {
  it('renders without throwing and markup contains v-surfer-wrapper (null-rendering component adds nothing, no document access in setup)', async () => {
    const { default: SurferKeyboard, KeyboardModule } =
      await import('../../src/vue/modules/keyboard');
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [KeyboardModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferKeyboard),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-wrapper');
  });
});

describe('KitSurfer SSR — mousewheel', () => {
  it('renders without throwing and markup contains v-surfer-wrapper (null-rendering component, no window/document access in setup)', async () => {
    const { default: SurferMousewheel, MousewheelModule } =
      await import('../../src/vue/modules/mousewheel');
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [MousewheelModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferMousewheel),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-wrapper');
  });
});

describe('KitSurfer SSR — controller', () => {
  it('renders without throwing and markup contains v-surfer-wrapper (null-rendering behavior module, no DOM access in setup)', async () => {
    const { default: SurferController, ControllerModule } =
      await import('../../src/vue/modules/controller');
    const { useSurferHost } = await import('../../src/vue/module-host');
    const target = useSurferHost({ slidesPerView: 1, spaceBetween: 0 });
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [ControllerModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferController, { control: target }),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-wrapper');
    target.dispose();
  });
});

describe('KitSurfer SSR — autoplay', () => {
  it('renders without throwing and markup contains v-surfer-wrapper (timers/listeners only start in onMounted, never on the server)', async () => {
    const { default: SurferAutoplay, AutoplayModule } =
      await import('../../src/vue/modules/autoplay');
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [AutoplayModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferAutoplay, { delay: 3000 }),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-wrapper');
  });
});

describe('KitSurfer SSR — a11y', () => {
  it('renders without throwing and markup contains v-surfer-wrapper (aria attributes applied in onMounted, not on server)', async () => {
    const { default: SurferA11y, A11yModule } = await import('../../src/vue/modules/a11y');
    const App = defineComponent({
      render() {
        return h(
          Surfer,
          { slidesPerView: 1, spaceBetween: 0, modules: [A11yModule] },
          {
            default: () => [
              ...Array.from({ length: 4 }, (_, i) => h(Item, { data: i, key: i })),
              h(SurferA11y),
            ],
          },
        );
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).toContain('v-surfer-wrapper');
  });
});
