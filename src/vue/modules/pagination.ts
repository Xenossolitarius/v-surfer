import {
  h,
  defineComponent,
  computed,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  watch,
  type PropType,
  type VNode,
} from 'vue';
import { defineSurferModule, injectHost, type ScopedEmit } from '../module-host';
import {
  paginationModel,
  paginationContainerClasses,
  paginationBulletClasses,
  type PaginationType,
  type PaginationModel,
} from '../../headless/pagination';

export interface PaginationConfig {
  type?: PaginationType;
  clickable?: boolean;
  slidesPerGroup?: number;
  hideOnClick?: boolean; // default false (frozen default)
  hiddenClass?: string; // default 'v-surfer-pagination-hidden' (frozen default)
}

/** Frozen-ported pagination events (src/modules/pagination/pagination.ts). render/update carry
 * the pagination root element; show/hide carry no payload. */
export interface PaginationEvents {
  paginationRender: HTMLElement;
  paginationUpdate: HTMLElement;
  paginationShow: void;
  paginationHide: void;
}

export const PAGINATION_EVENT_NAMES = [
  'paginationRender',
  'paginationUpdate',
  'paginationShow',
  'paginationHide',
] as const;

/** The pagination module's Api: its scoped emitter, used by the render component. */
export interface PaginationApi {
  emit: ScopedEmit<PaginationEvents>;
}

export const PaginationModule = defineSurferModule<PaginationConfig, PaginationEvents>()(
  'pagination',
  ({ emit }): PaginationApi => ({ emit }),
);

const SurferPagination = defineComponent({
  name: 'SurferPagination',
  emits: [...PAGINATION_EVENT_NAMES],
  props: {
    type: { type: String as PropType<PaginationType>, default: undefined },
    clickable: { type: Boolean, default: undefined },
    slidesPerGroup: { type: Number, default: undefined },
  },
  setup(props, ctx) {
    const host = injectHost();
    const cfg = host.config.pagination as PaginationConfig | undefined;
    const type = (): PaginationType => cfg?.type ?? props.type ?? 'bullets';
    const clickable = (): boolean => cfg?.clickable ?? props.clickable ?? true;
    const spg = (): number => cfg?.slidesPerGroup ?? props.slidesPerGroup ?? 1;

    // The module's scoped emitter (bus-routed). No-op fallback if the module is not registered.
    const pagApi = host.modules.pagination as PaginationApi | undefined;
    const emit = (pagApi?.emit ?? (() => {})) as ScopedEmit<PaginationEvents>;

    // Surface pagination events on THIS component (component separation: never on <Surfer>).
    // render/update carry the root element payload; show/hide carry nothing.
    const offs = PAGINATION_EVENT_NAMES.map((name) =>
      host.on(name, (p) => (p === undefined ? ctx.emit(name) : ctx.emit(name, p))),
    );
    onBeforeUnmount(() => offs.forEach((off) => off()));

    // The pagination root element (kit analog of frozen's pagination `el[0]`), carried as the
    // paginationRender/paginationUpdate payload.
    const rootEl = ref<HTMLElement | null>(null);

    // paginationRender on initial mount (frozen render() at init).
    onMounted(() => {
      if (rootEl.value) emit('paginationRender', rootEl.value);
    });

    const goTo = (i: number): void => {
      const loop = host.state.value.layout.loop;
      if (loop) host.engine.slideToLoop(i);
      else host.goTo(i * spg());
    };
    const model = computed(() => {
      const s = host.state.value;
      const loop = s.layout.loop;
      return paginationModel(s, {
        type: type(),
        loop,
        slidesPerGroup: spg(),
        slidesLength: s.slides.length,
      });
    });

    // paginationRender re-fires when the bullet DOM rebuilds — frozen render() on a structural
    // change (type or bullet count). flush 'post' so rootEl reflects the rebuilt DOM; not
    // immediate (onMounted already covers the initial render).
    watch(
      () => [type(), model.value.bullets.length] as const,
      () => {
        if (rootEl.value) emit('paginationRender', rootEl.value);
      },
      { flush: 'post' },
    );

    // paginationUpdate on every content re-render after mount (frozen update()).
    onUpdated(() => {
      if (rootEl.value) emit('paginationUpdate', rootEl.value);
    });

    // hideOnClick: a click on the surfer container (not on a bullet, not on a nav button) toggles
    // the pagination's hidden class and emits show/hide on the flip (frozen pagination.ts:488-513).
    const hidden = ref(false);
    const hiddenClass = (): string => cfg?.hiddenClass ?? 'v-surfer-pagination-hidden';
    const containerClass = (m: PaginationModel): string[] => {
      const c = paginationContainerClasses(m);
      if (hidden.value) c.push(hiddenClass());
      return c;
    };
    watch(
      () => host.containerEl.value,
      (el, _prev, onCleanup) => {
        if (!el) return;
        const onContainerClick = (e: MouseEvent): void => {
          if (!cfg?.hideOnClick) return;
          const t = e.target;
          if (!(t instanceof Element)) return;
          if (t.closest('.v-surfer-pagination-bullet')) return; // a bullet
          if (t.closest('.v-surfer-button-prev, .v-surfer-button-next')) return; // a nav button
          if (hidden.value) emit('paginationShow');
          else emit('paginationHide');
          hidden.value = !hidden.value;
        };
        el.addEventListener('click', onContainerClick);
        onCleanup(() => el.removeEventListener('click', onContainerClick));
      },
      { immediate: true },
    );

    return (): VNode => {
      const m = model.value;
      if (m.type === 'fraction') {
        return h('div', { ref: rootEl, class: containerClass(m) }, [
          h('span', { class: 'v-surfer-pagination-current' }, String(m.fraction.current)),
          ' / ',
          h('span', { class: 'v-surfer-pagination-total' }, String(m.fraction.total)),
        ]);
      }

      if (m.type === 'progressbar') {
        return h('div', { ref: rootEl, class: containerClass(m) }, [
          h('span', {
            class: 'v-surfer-pagination-progressbar-fill',
            style: {
              transform: `translate3d(0px, 0px, 0px) scaleX(${m.progress})`,
              transformOrigin: 'left top',
            },
          }),
        ]);
      }

      const bullets: VNode[] = m.bullets.map((i) =>
        h('span', {
          key: i,
          class: paginationBulletClasses(i, m.current),
          onClick: clickable() ? () => goTo(i) : undefined,
        }),
      );
      return h('div', { ref: rootEl, class: containerClass(m) }, bullets);
    };
  },
});

export default SurferPagination;
