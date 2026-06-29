import type { EngineState } from './types';

export interface Store<T> {
  get(): EngineState<T>;
  set(next: EngineState<T>): void;
  subscribe(listener: (state: EngineState<T>) => void): () => void;
  clear(): void;
}

/** A minimal frozen-snapshot store with synchronous notification. */
export function createStore<T>(initial: EngineState<T>): Store<T> {
  let state = Object.freeze(initial);
  const listeners = new Set<(state: EngineState<T>) => void>();
  return {
    get: () => state,
    set(next: EngineState<T>) {
      state = Object.freeze(next);
      listeners.forEach((l) => l(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear() {
      listeners.clear();
    },
  };
}
