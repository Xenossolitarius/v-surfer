# Events

Every core engine event is available two ways: as a Vue event on `<Surfer>`, and via the host's `on()` API.

## Vue events

```vue
<Surfer @slide-change="onChange" @reach-end="loadMore" @touch-start="onTouch" />
```

Event names are camelCase exports, emitted kebab-cased in templates (`slideChange` → `@slide-change`).

## Programmatic: `host.on()`

`host.on(name, handler)` subscribes and returns an unsubscribe function. This is the only way to receive **module** events (autoplay, navigation, pagination, …), which are not forwarded as Vue events.

```ts
const off = host.on('slideChange', (payload) => { /* ... */ })
// later
off()
```

When the host comes from `useSurferHost()`, both the event name and the payload type are checked against the host's module list.

## Core event names

The full set is exported as `CORE_EVENT_NAMES`:

```
activeIndexChange, slideChange, realIndexChange, snapIndexChange, progress,
reachBeginning, reachEnd, toEdge, fromEdge, setTranslate, setTransition,
slidesLengthChange, snapGridLengthChange, slidesGridLengthChange, slidesUpdated,
changeDirection, beforeTransitionStart, transitionStart, transitionEnd,
beforeSlideChangeStart, slideChangeTransitionStart, slideChangeTransitionEnd,
slideNextTransitionStart, slideNextTransitionEnd, slidePrevTransitionStart,
slidePrevTransitionEnd, slideResetTransitionStart, slideResetTransitionEnd,
beforeLoopFix, loopFix, momentumBounce, update,
touchStart, touchMove, touchEnd, sliderMove, sliderFirstMove, touchMoveOpposite,
tap, click, doubleTap, doubleClick, beforeResize, resize,
lock, unlock, breakpoint
```

## Module events

Module events ride the same bus. Examples:

- **Autoplay** — `autoplayStart`, `autoplayStop`, `autoplayPause`, `autoplayResume`, `autoplayTimeLeft`
- **Navigation** — `navigationNext`, `navigationPrev`
- **Pagination** — `paginationUpdate`, `paginationRender`
- **Scrollbar** — `scrollbarDragStart`, `scrollbarDragMove`, `scrollbarDragEnd`

Subscribe to them through `host.on()` — they only appear in the typed event set when the matching module is in the host's `modules` list.
