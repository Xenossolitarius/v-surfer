# Composables

Imported from the main entry. The first three are covered task-first in the [Composables guide](/guide/composables); this page is the signature reference. `defineSurferModule()` is the custom-module authoring API.

## `useSurfer()`

```ts
function useSurfer(): ModuleHost
```

Injects the live [host](/api/host) from the nearest `<Surfer>` ancestor. Alias of `injectHost()`. Throws if called outside a `<Surfer>` subtree.

```ts
const surfer = useSurfer()
surfer.next()
surfer.state.value.activeIndex
```

## `useSurferHost()`

```ts
function useSurferHost<M extends ModuleDef[]>(
  opts?: ReactiveEngineParams & { modules?: M; config?: ConfigInput<M> },
): TypedModuleHost<M>
```

Builds a host outside `<Surfer>` and returns it typed against `M`. Param entries accept a raw value, a `ref`, or a getter (`MaybeRefOrGetter`); reactive entries are re-applied to the engine when they change. Pass the result to `<Surfer :host>`.

```ts
const host = useSurferHost({
  slidesPerView: 1,
  spaceBetween: 16,
  modules: [NavigationModule],
})

const off = host.on('slideChange', () => console.log(host.state.value.activeIndex))
```

::: warning Lifecycle
When you pass an external `:host`, `<Surfer>` does **not** dispose it on unmount. Call your `on()` unsubscribers and `host.dispose()` yourself (e.g. in `onUnmounted`). A host created inside a component scope is also torn down when that scope is disposed.
:::

## `useSurferSlide()`

```ts
function useSurferSlide(): ComputedRef<ItemFlags>
```

Inside an `<Item>` slot subtree, returns the current slide's reactive flags. Throws if called outside an `<Item>`. See [`ItemFlags`](/api/components#scoped-slot-props-itemflags).

```ts
const slide = useSurferSlide()
// slide.value.isActive, slide.value.isVisible, slide.value.index
```

## `defineSurferModule()`

```ts
function defineSurferModule<Config extends object, Events extends object = {}>():
  <K extends string, Api = void>(
    key: K,
    setup?: (ctx: { host: CoreHost; config: Config; emit: ScopedEmit<Events> }) => Api,
  ) => ModuleDef<K, Config, Api, Events>
```

Authors a typed module object. The double-call form fixes `Config`/`Events` explicitly while inferring `key` and the `Api` return type. The returned `ModuleDef` goes in `<Surfer :modules>` (or `useSurferHost({ modules })`).

```ts
import { defineSurferModule } from 'v-surfer'

interface LoggerConfig { label?: string }
interface LoggerEvents { logged: { index: number } }

export const LoggerModule = defineSurferModule<LoggerConfig, LoggerEvents>()(
  'logger',
  ({ host, config, emit }) => {
    const off = host.on('slideChange', () => {
      const index = host.activeIndex.value
      console.log(config.label ?? 'slide', index)
      emit('logged', { index })
    })
    // Anything returned becomes host.modules.logger
    return { stop: off }
  },
)
```

- `key` keys the module in `host.modules` and `host.config`.
- `setup` runs once when the host is built; its return value is the module's public API (`host.modules[key]`).
- `config` is the reactive options object (from `<Surfer :config>` / `useSurferHost({ config })`).
- `emit` is scoped to the module's declared `Events`; emitted events ride the same bus as core events, reachable via `host.on()`.

### `injectHost()` / `HOST_KEY`

```ts
function injectHost(): ModuleHost
const HOST_KEY: InjectionKey<ModuleHost>
```

`injectHost()` is the underlying inject used by `<Item>` and module components; `useSurfer()` is its public alias. `HOST_KEY` is the provide/inject key, exported for advanced interop.
