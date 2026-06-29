import { shallowRef, onScopeDispose, getCurrentScope, type ShallowRef } from 'vue';
import type { Engine, EngineState } from '../headless/types';

/** Mirror an engine's snapshot stream into a Vue ref (kit-local copy of the
 * vue-headless bridge, so the kit is self-contained). */
export function useEngine<T>(engine: Engine<T>): ShallowRef<EngineState<T>> {
  const state = shallowRef<EngineState<T>>(engine.state);
  const unsubscribe = engine.subscribe((next) => {
    state.value = next;
  });
  if (getCurrentScope()) onScopeDispose(unsubscribe);
  return state;
}
