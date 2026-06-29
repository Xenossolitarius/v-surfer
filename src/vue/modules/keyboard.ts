import { defineComponent, onMounted, onBeforeUnmount, watch, reactive, type PropType } from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import { keyboardAction } from '../../headless/keyboard';

export interface KeyboardConfig {
  enabled?: boolean;
  onlyInViewport?: boolean;
  pageUpDown?: boolean;
  speed?: number;
}

export interface KeyboardEvents {
  /** A handled navigation key was pressed; payload is the keyCode (frozen emits the raw keyCode). */
  keyPress: number;
}
export const KEYBOARD_EVENT_NAMES = ['keyPress'] as const;

export interface KeyboardApi {
  emit: ScopedEmit<KeyboardEvents>;
  enabled: boolean;
  enable(): void;
  disable(): void;
}

/** Module: contributes typed host.config.keyboard + a reactive Api the component populates. */
export const KeyboardModule = defineSurferModule<KeyboardConfig, KeyboardEvents>()(
  'keyboard',
  ({ emit }): KeyboardApi =>
    reactive({ emit, enabled: false, enable: () => {}, disable: () => {} }) as KeyboardApi,
);

const SurferKeyboard = defineComponent({
  name: 'SurferKeyboard',
  props: {
    enabled: { type: Boolean, default: true },
    onlyInViewport: { type: Boolean, default: true },
    pageUpDown: { type: Boolean, default: true },
    speed: { type: Number as PropType<number | undefined>, default: undefined },
  },
  emits: [...KEYBOARD_EVENT_NAMES],
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.keyboard as KeyboardConfig | undefined;

    const api =
      (host.modules.keyboard as KeyboardApi | undefined) ??
      ({ emit: () => {}, enabled: true, enable: () => {}, disable: () => {} } as KeyboardApi);
    api.enabled = cfg?.enabled ?? props.enabled ?? true;
    api.enable = () => {
      api.enabled = true;
    };
    api.disable = () => {
      api.enabled = false;
    };
    // Forward module events from the bus to this component's emit (disposed on unmount).
    const offForwarders = KEYBOARD_EVENT_NAMES.map((name) =>
      host.on(name, (p) => (p === undefined ? ctx.emit(name) : ctx.emit(name, p))),
    );

    let boundDoc: Document | undefined;

    // The slider is "in viewport" when any corner of containerEl lies inside the window.
    const inViewport = (): boolean => {
      const el = host.containerEl.value;
      if (!el) return true; // degrade open when no host element is provided
      const r = el.getBoundingClientRect();
      const w = window.innerWidth;
      const hh = window.innerHeight;
      const corners: [number, number][] = [
        [r.left, r.top],
        [r.left + r.width, r.top],
        [r.left, r.top + r.height],
        [r.left + r.width, r.top + r.height],
      ];
      for (const [x, y] of corners) {
        if (x >= 0 && x <= w && y >= 0 && y <= hh) {
          if (x === 0 && y === 0) continue;
          return true;
        }
      }
      return false;
    };

    const handle = (event: KeyboardEvent) => {
      if (!api.enabled) return;

      const active = boundDoc?.activeElement as HTMLElement | null;
      if (
        active &&
        (active.isContentEditable ||
          active.nodeName?.toLowerCase() === 'input' ||
          active.nodeName?.toLowerCase() === 'textarea')
      ) {
        return;
      }

      const code = event.keyCode || event.charCode;
      const isNav =
        code === 33 || code === 34 || code === 37 || code === 38 || code === 39 || code === 40;
      const onlyInViewport = cfg?.onlyInViewport ?? props.onlyInViewport ?? true;
      if (onlyInViewport && isNav && !inViewport()) return;

      const pageUpDown = cfg?.pageUpDown ?? props.pageUpDown ?? true;
      const layout = host.state.value.layout;
      const result = keyboardAction(
        code,
        {
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        },
        { direction: layout.direction, rtl: layout.rtl, pageUpDown },
      );
      if (result.action === 'none') return;
      if (result.preventDefault) event.preventDefault();
      api.emit('keyPress', code);
      const speed = cfg?.speed ?? props.speed;
      const opts = speed != null ? { speed } : undefined;
      if (result.action === 'next') host.next(opts);
      else host.prev(opts);
    };

    const bind = () => {
      if (boundDoc) return;
      boundDoc = host.containerEl.value?.ownerDocument ?? document;
      boundDoc.addEventListener('keydown', handle);
    };
    const unbind = () => {
      boundDoc?.removeEventListener('keydown', handle);
      boundDoc = undefined;
    };

    onMounted(() => {
      if (api.enabled) bind();
    });
    watch(
      () => cfg?.enabled ?? props.enabled ?? true,
      (on) => {
        api.enabled = on;
      },
    );
    watch(
      () => api.enabled,
      (on) => (on ? bind() : unbind()),
    );
    onBeforeUnmount(() => {
      offForwarders.forEach((off) => off());
      unbind();
    });

    return () => null;
  },
});

export default SurferKeyboard;
