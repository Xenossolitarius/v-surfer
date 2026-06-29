# Host

The **host** is the live, reactive control object behind every slider — the programmatic handle. The reactive engine *parameters* are set on `<Surfer>` (see [Parameters](/api/parameters)); everything you *call* or *read at runtime* lives on the host.

## Three ways to get a handle

```ts
// 1. Inside a <Surfer> subtree — returns the injected ModuleHost.
const host = useSurfer()

// 2. Externally — returns a TypedModuleHost<M>, then hand it to <Surfer :host>.
const host = useSurferHost({ slidesPerView: 1, modules: [NavigationModule] })

// 3. Via the onReady callback prop — receives the live host once ready.
<Surfer :on-ready="(host) => { /* … */ }" />
```

`useSurferHost()` returns a `TypedModuleHost<M>` whose `on()` and `modules` are narrowed to the modules you listed — event names, payloads, and `host.modules.<key>` are all type-checked against `M`. The host injected by `useSurfer()` (and passed to `onReady`) is the runtime `ModuleHost`, whose `on()`/`modules` are untyped. The members below are common to both.

## Reactive state

All of these are `ComputedRef`/`ShallowRef` — read `.value`.

| Member | Type | Description |
| --- | --- | --- |
| `state` | `ShallowRef<EngineState>` | The full engine snapshot |
| `activeIndex` | `ComputedRef<number>` | Active layout index |
| `realIndex` | `ComputedRef<number>` | Active index in the source list |
| `previousIndex` | `ComputedRef<number>` | Previous active index |
| `snapIndex` | `ComputedRef<number>` | Nearest snap-point index |
| `count` | `ComputedRef<number>` | Number of slides |
| `progress` | `ComputedRef<number>` | Overall progress, `0`–`1` |
| `isBeginning` | `ComputedRef<boolean>` | At the first snap |
| `isEnd` | `ComputedRef<boolean>` | At the last snap |
| `isLocked` | `ComputedRef<boolean>` | Slides underfill the container |
| `translate` | `ComputedRef<number>` | Current wrapper translate (px) |
| `animating` | `ComputedRef<boolean>` | A transition is running |
| `swipeDirection` | `ComputedRef<'prev' \| 'next' \| undefined>` | Direction of the last drag |
| `touches` | `ComputedRef<…>` | Live touch/drag coordinates |
| `slides` | `ComputedRef<…[]>` | Per-slide engine state |
| `slidesGrid` / `snapGrid` / `slidesSizesGrid` | `ComputedRef<number[]>` | Layout grids (px) |
| `enabled` | `ShallowRef<boolean>` | Interaction gate; drags don't start while `false` |
| `params` | `EngineParams` | Fully-resolved params (read-only) |
| `width` / `height` | `number` | Container size in px (`0` before mount) |
| `containerEl` / `wrapperEl` | `ShallowRef<HTMLElement \| null>` | Root + track elements |
| `slideEls` | `ShallowRef<(HTMLElement \| null)[]>` | Slide elements |
| `clickedIndex` | `ShallowRef<number>` | Last tapped slide index, `-1` when none |
| `clickedSlide` | `ShallowRef<HTMLElement \| null>` | Last tapped slide element |

## Navigation methods

| Method | Signature | Description |
| --- | --- | --- |
| `goTo` | `(index, { speed? }?)` | Slide to a layout index |
| `next` | `({ speed? }?)` | Advance one group |
| `prev` | `({ speed? }?)` | Go back one group |
| `slideToLoop` | `(realIndex, { speed? }?)` | Slide to a source-list index (loop-aware) |
| `slideToClosest` | `({ speed? }?)` | Snap to the nearest slide |
| `slideReset` | `({ speed? }?)` | Re-snap to the current active slide |

## Translate & progress methods

| Method | Signature | Description |
| --- | --- | --- |
| `getTranslate` | `(): number` | Current translate |
| `setTranslate` | `(translate)` | Set translate immediately |
| `translateTo` | `(translate, speed?)` | Animate to a translate |
| `minTranslate` | `(): number` | Translate at the beginning |
| `maxTranslate` | `(): number` | Translate at the end |
| `setProgress` | `(progress, speed?)` | Jump to a progress value (`speed` ignored — free-scrub is instant) |

## Control methods

| Method | Signature | Description |
| --- | --- | --- |
| `update` | `()` | Recompute layout |
| `updateSize` / `updateSlides` / `updateProgress` / `updateSlidesClasses` / `updateAutoHeight` | `()` | Frozen-parity aliases — all recompute (the kit derives the rest reactively) |
| `slidesPerViewDynamic` | `(view?, exact?): number` | Visible-slide count for the current/previous view |
| `changeDirection` | `(direction?)` | Flip axis; no arg toggles |
| `enable` / `disable` | `()` | Toggle the interaction gate |
| `setGrabCursor` / `unsetGrabCursor` | `()` | Toggle the grab cursor on the wrapper |
| `dispose` | `()` | Tear down the host (only relevant for externally-built hosts) |

## Events

```ts
const off = host.on('slideChange', (payload) => { /* … */ })
off() // unsubscribe
```

`on(name, handler)` subscribes to any core **or** module event and returns an unsubscribe function. This is the only way to receive module events. With a `useSurferHost()` host, both the name and payload are type-checked against the host's module list. See [Events](/api/events).

## Module APIs

`host.modules` maps each active module's key to its imperative API:

```ts
host.modules.autoplay.stop()
host.modules.autoplay.running // boolean
```

Each module's API surface is documented in [Modules](/api/modules/). `host.config` holds the resolved per-module options under the same keys.
