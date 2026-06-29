import { describe, it, expectTypeOf } from 'vitest';
import { useSurferHost, defineSurferModule } from '../../src/vue/module-host';

// A module declaring a typed Events map; its setup receives a scoped `emit`.
const navModule = defineSurferModule<{ x?: number }, { navigationNext: void; ping: number }>()(
  'nav',
  ({ emit }) => {
    emit('navigationNext'); // void → no payload
    emit('ping', 5); // number payload
    // @ts-expect-error wrong payload type for a declared event
    emit('ping', 'no');
    // @ts-expect-error not this module's event
    emit('slideChange');
    return { emit };
  },
);

describe('types: host events', () => {
  it('host.on is typed over core + module events', () => {
    const host = useSurferHost({ modules: [navModule] });
    host.on('slideChange', (p) => expectTypeOf(p).toEqualTypeOf<void>());
    host.on('setTranslate', (p) => expectTypeOf(p).toEqualTypeOf<number>());
    host.on('touchStart', (p) => expectTypeOf(p).toEqualTypeOf<PointerEvent>());
    host.on('navigationNext', (p) => expectTypeOf(p).toEqualTypeOf<void>());
    host.on('ping', (p) => expectTypeOf(p).toEqualTypeOf<number>());
    // @ts-expect-error unknown event name
    host.on('bogusEvent', () => {});
    host.dispose();
  });
});
