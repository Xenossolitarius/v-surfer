import { defineComponent, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';
import { defineSurferModule, injectHost, type ModuleHost } from '../module-host';
import { linkControllers, type ControllerLink } from '../../headless/controller';
import type { Engine } from '../../headless/types';

export interface ControllerConfig {
  control?: ModuleHost | Engine<unknown> | (ModuleHost | Engine<unknown>)[];
  by?: 'slide' | 'container';
  inverse?: boolean;
  twoWay?: boolean;
  enabled?: boolean;
}

/** Config-only module: contributes typed host.config.controller; the component handles linking. */
export const ControllerModule = defineSurferModule<ControllerConfig>()('controller');

const SurferController = defineComponent({
  name: 'SurferController',
  props: {
    control: {
      type: [Object, Array] as PropType<
        ModuleHost | Engine<unknown> | (ModuleHost | Engine<unknown>)[]
      >,
      required: true,
    },
    by: { type: String as PropType<'slide' | 'container'>, default: 'slide' },
    inverse: { type: Boolean, default: false },
    twoWay: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  setup(props) {
    const host = injectHost();
    const cfg = host.config.controller as ControllerConfig | undefined;

    let link: ControllerLink | undefined;

    const normalizeTarget = (c: ModuleHost | Engine<unknown>): Engine<unknown> =>
      'engine' in c ? (c as ModuleHost).engine : (c as Engine<unknown>);

    const build = () => {
      if (link) return;
      const enabled = cfg?.enabled ?? props.enabled ?? true;
      if (!enabled) return;

      const rawControl = cfg?.control ?? props.control;
      if (!rawControl) return;
      const rawList = Array.isArray(rawControl) ? rawControl : [rawControl];
      const targets = rawList.map(normalizeTarget);
      if (targets.length === 0) return;

      const by = cfg?.by ?? props.by ?? 'slide';
      const inverse = cfg?.inverse ?? props.inverse ?? false;
      const twoWay = cfg?.twoWay ?? props.twoWay ?? false;
      const layout = host.state.value.layout;
      const loop = layout.loop ?? false;
      const rtl = layout.rtl ?? false;

      const edges = targets.flatMap((target) => {
        const forward = { from: host.engine, to: target, by, inverse, loop, rtl };
        return twoWay
          ? [forward, { from: target, to: host.engine, by, inverse, loop, rtl }]
          : [forward];
      });

      link = linkControllers(edges);
    };

    const teardown = () => {
      link?.destroy();
      link = undefined;
    };

    const relink = () => {
      teardown();
      build();
    };

    onMounted(build);
    watch(
      () => [
        cfg?.control ?? props.control,
        cfg?.by ?? props.by,
        cfg?.inverse ?? props.inverse,
        cfg?.twoWay ?? props.twoWay,
        cfg?.enabled ?? props.enabled,
      ],
      relink,
    );
    onBeforeUnmount(teardown);

    return () => null;
  },
});

export default SurferController;
