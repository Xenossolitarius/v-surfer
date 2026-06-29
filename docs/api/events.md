# Events

Events come in two families. **Core events** are emitted by the engine (plus the DOM touch/resize events the Vue layer raises) — available both as Vue events on `<Surfer>` and through `host.on()`. **Module events** ride the same bus but are only reachable through `host.on()`. See the [Events guide](/guide/events) for usage.

```ts
const off = host.on('slideChange', () => { /* … */ })
off() // unsubscribe
```

Names are camelCase exports; as Vue events they're kebab-cased (`slideChange` → `@slide-change`). The runtime list of core names is exported as `CORE_EVENT_NAMES`.

## Core events

Payload is `void` (no argument) unless a type is shown.

### Index & progress

| Event | Payload | Fires when |
| --- | --- | --- |
| `activeIndexChange` | — | The active layout index changes |
| `slideChange` | — | The active slide changes |
| `realIndexChange` | — | The active source-list index changes |
| `snapIndexChange` | — | The nearest snap index changes |
| `progress` | `number` | Overall progress (`0`–`1`) changes |
| `reachBeginning` | — | The slider reaches the first snap |
| `reachEnd` | — | The slider reaches the last snap |
| `toEdge` | — | An edge (beginning or end) is reached |
| `fromEdge` | — | The slider leaves an edge |

### Translate & transitions

| Event | Payload | Fires when |
| --- | --- | --- |
| `setTranslate` | `number` | The wrapper translate is set |
| `setTransition` | `number` | A transition duration is set |
| `beforeTransitionStart` | — | Just before a transition begins |
| `transitionStart` | — | A transition begins |
| `transitionEnd` | — | A transition ends |
| `beforeSlideChangeStart` | — | Just before a slide change begins |
| `slideChangeTransitionStart` | — | A slide-change transition begins |
| `slideChangeTransitionEnd` | — | A slide-change transition ends |
| `slideNextTransitionStart` / `slideNextTransitionEnd` | — | Next-direction transition boundaries |
| `slidePrevTransitionStart` / `slidePrevTransitionEnd` | — | Prev-direction transition boundaries |
| `slideResetTransitionStart` / `slideResetTransitionEnd` | — | Reset (re-snap) transition boundaries |

### Layout, loop & lifecycle

| Event | Payload | Fires when |
| --- | --- | --- |
| `slidesLengthChange` | — | The slide count changes |
| `snapGridLengthChange` | — | The snap grid length changes |
| `slidesGridLengthChange` | — | The slides grid length changes |
| `slidesUpdated` | — | Slides are recomputed |
| `changeDirection` | — | The axis flips |
| `beforeLoopFix` / `loopFix` | — | Around a loop-clone repositioning |
| `momentumBounce` | — | Free-mode momentum bounces at an edge |
| `update` | — | The engine recomputes |
| `beforeResize` / `resize` | — | Around a container resize |
| `lock` / `unlock` | — | Slides become un-/swipeable (under/overfill) |
| `breakpoint` | — | A responsive breakpoint activates |

### Pointer & tap (DOM)

Each carries the originating `PointerEvent`.

| Event | Payload |
| --- | --- |
| `touchStart`, `touchMove`, `touchEnd` | `PointerEvent` |
| `sliderMove`, `sliderFirstMove`, `touchMoveOpposite` | `PointerEvent` |
| `tap`, `click`, `doubleTap`, `doubleClick` | `PointerEvent` |

## Module events

Only delivered through `host.on()`, and only typed when the matching module is in the host's `modules` list.

| Module | Events | Payload |
| --- | --- | --- |
| [Autoplay](/api/modules/autoplay#events) | `autoplay`, `autoplayStart`, `autoplayStop`, `autoplayPause`, `autoplayResume` | — |
| [Autoplay](/api/modules/autoplay#events) | `autoplayTimeLeft` | `{ timeLeft: number; percentage: number }` |
| [Navigation](/api/modules/navigation#events) | `navigationNext`, `navigationPrev`, `navigationShow`, `navigationHide` | — |
| [Pagination](/api/modules/pagination#events) | `paginationRender`, `paginationUpdate` | `HTMLElement` |
| [Pagination](/api/modules/pagination#events) | `paginationShow`, `paginationHide` | — |
| [Scrollbar](/api/modules/scrollbar#events) | `scrollbarDragStart`, `scrollbarDragMove`, `scrollbarDragEnd` | `PointerEvent` |
| [Keyboard](/api/modules/keyboard#events) | `keyPress` | `number` (key code) |
| [Mousewheel](/api/modules/mousewheel#events) | `scroll` | `WheelEvent` |

Each module's events are detailed on its own page — see [Modules](/api/modules/).
