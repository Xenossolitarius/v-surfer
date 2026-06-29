import { createApp, h, type App } from 'vue';
import KitSurfer from '../../src/vue/surfer';
import KitItem from '../../src/vue/item';
import type { ModuleHost } from '../../src/vue/module-host';

export type MountedKit = {
  el: HTMLElement;
  host: ModuleHost;
  app: App;
  destroy: () => void;
};

/**
 * Mount a real, sized KitSurfer in the browser DOM and return it + a cleanup fn.
 * Mirrors mountSurfer: width/height size the container; slideWidth sizes each slide's
 * inner box (accepts a number for uniform slides or a per-index function for variable widths).
 */
export function mountKitSurfer(
  slideCount: number,
  params: Record<string, unknown> = {},
  width = 600,
  height = 300,
  slideWidth: number | ((i: number) => number) = 200,
): MountedKit {
  const el = document.createElement('div');
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  document.body.appendChild(el);

  let resolvedHost: ModuleHost | null = null;
  const app = createApp({
    render() {
      return h(
        KitSurfer,
        {
          ...params,
          style: { width: '100%', height: '100%' },
          onReady: (h2: ModuleHost) => {
            resolvedHost = h2;
          },
        },
        {
          default: () =>
            Array.from({ length: slideCount }, (_, i) => {
              const w = typeof slideWidth === 'function' ? slideWidth(i) : slideWidth;
              return h(
                KitItem,
                { data: i, key: i },
                {
                  default: () =>
                    h(
                      'div',
                      { class: 'slide-box', style: { width: `${w}px`, height: '200px' } },
                      `Slide ${i + 1}`,
                    ),
                },
              );
            }),
        },
      );
    },
  });
  app.mount(el);

  return {
    el,
    get host(): ModuleHost {
      if (!resolvedHost) throw new Error('KitSurfer host not ready — await nextTick() first');
      return resolvedHost;
    },
    app,
    destroy() {
      app.unmount();
      el.remove();
    },
  } as MountedKit;
}
