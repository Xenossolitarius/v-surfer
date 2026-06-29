# Parameters

Every parameter below is a reactive **`<Surfer>` prop** *and* an accepted key of **`useSurferHost()`**. Each defaults to `undefined` on the component, so an unset prop falls through to the engine default shown here.

```vue
<Surfer :slides-per-view="3" :space-between="16" :loop="true" />
```

```ts
const host = useSurferHost({ slidesPerView: 3, spaceBetween: 16, loop: true })
```

Behavioral (non-engine) props — `host`, `modules`, `config`, `onReady`, `tag`, `grabCursor`, `noSwiping`, … — live on [Components](/api/components). Module options live with each [module](/api/modules/).

## Layout

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `slidesPerView` | `number \| 'auto'` | `1` | Slides visible at once; `'auto'` sizes each slide to its content |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | Scroll axis |
| `rtl` | `boolean` | `false` | Right-to-left layout |
| `spaceBetween` | `number` | `0` | Gap between slides (px) |
| `speed` | `number` | `300` | Transition duration (ms) |
| `initialSlide` | `number` | `0` | Index shown on init |
| `autoHeight` | `boolean` | `false` | Size the wrapper to the active slide |
| `roundLengths` | `boolean` | `false` | Round slide sizes/offsets to whole px |
| `cssMode` | `boolean` | `false` | Use native CSS scroll-snap instead of transforms |

## Slides per group

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `slidesPerGroup` | `number` | `1` | Slides advanced per swipe/navigation |
| `slidesPerGroupSkip` | `number` | `0` | Leading slides that advance one at a time |
| `slidesPerGroupAuto` | `boolean` | `false` | Derive the group size from the visible count |
| `normalizeSlideIndex` | `boolean` | `true` | Report the active index normalized for loop clones |

## Centering

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `centeredSlides` | `boolean` | `false` | Center the active slide |
| `centerInsufficientSlides` | `boolean` | `false` | Center slides when they underfill the container |
| `centeredSlidesBounds` | `boolean` | `false` | Clamp centering so edges don't gap |

## Loop & rewind

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `loop` | `boolean \| object` | `false` | Infinite looping (object form below) |
| `loopAdditionalSlides` | `number` | `0` | Extra clones rendered on each side |
| `loopPreventsSliding` | `boolean` | `true` | Block navigation during a loop fix |
| `rewind` | `boolean` | `false` | At an edge, wrap to the other end instead of stopping |

## Virtual

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `virtual` | `boolean \| object` | `false` | Render only the visible window (object form below) |
| `addSlidesBefore` | `number` | `0` | Extra slides rendered before the window |
| `addSlidesAfter` | `number` | `0` | Extra slides rendered after the window |
| `virtualAutoSlidesPerView` | `number` | `0` | Estimated visible count for `slidesPerView: 'auto'` + virtual (`0` → `1`) |

## Free mode

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `freeMode` | `boolean \| object` | `false` | Momentum / free scrolling (object form below) |
| `freeModeMomentum` | `boolean` | `true` | Continue moving after release |
| `freeModeMomentumRatio` | `number` | `1` | Momentum distance multiplier |
| `freeModeMomentumVelocityRatio` | `number` | `1` | Momentum velocity multiplier |
| `freeModeMomentumBounce` | `boolean` | `true` | Bounce at the edges |
| `freeModeMomentumBounceRatio` | `number` | `1` | Bounce strength |
| `freeModeSticky` | `boolean` | `false` | Snap to the nearest slide after momentum |
| `freeModeMinimumVelocity` | `number` | `0.02` | Velocity floor for momentum to start |

## Touch & gestures

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `allowTouchMove` | `boolean` | `true` | Enable pointer dragging |
| `allowSlideNext` | `boolean` | `true` | Allow movement to the next slide |
| `allowSlidePrev` | `boolean` | `true` | Allow movement to the previous slide |
| `simulateTouch` | `boolean` | `true` | Treat mouse as touch |
| `touchRatio` | `number` | `1` | Drag-to-travel ratio |
| `touchAngle` | `number` | `45` | Max angle (°) that still counts as a swipe |
| `touchReleaseOnEdges` | `boolean` | `false` | Release the gesture at the edges (let the page scroll) |
| `threshold` | `number` | `5` | Min px moved before a drag starts |
| `resistance` | `boolean` | `true` | Edge resistance |
| `resistanceRatio` | `number` | `0.85` | Resistance strength |
| `followFinger` | `boolean` | `true` | Track the pointer during a drag |
| `shortSwipes` | `boolean` | `true` | Allow quick flicks |
| `longSwipes` | `boolean` | `true` | Allow slow drags past the threshold |
| `longSwipesMs` | `number` | `300` | Long-swipe time window (ms) |
| `longSwipesRatio` | `number` | `0.5` | Long-swipe distance ratio |
| `oneWayMovement` | `boolean` | `false` | Lock travel to a single direction |

## Grouped parameters

Six parameters also accept a one-level object form, collapsed onto the flat keys above. A bare `boolean` (or `{}`) is the `enabled` shorthand, and an explicit flat sibling prop always wins over a nested field.

| Group prop | Object fields → flat key |
| --- | --- |
| `loop` | `enabled` → `loop`, `additionalSlides` → `loopAdditionalSlides`, `preventsSliding` → `loopPreventsSliding` |
| `freeMode` | `enabled` → `freeMode`, `momentum`, `momentumRatio`, `momentumVelocityRatio`, `momentumBounce`, `momentumBounceRatio`, `sticky`, `minimumVelocity` → the matching `freeMode*` keys |
| `virtual` | `enabled` → `virtual`, `addSlidesBefore`, `addSlidesAfter`, `autoSlidesPerView` → `virtualAutoSlidesPerView` |
| `centered` | `enabled` → `centeredSlides`, `insufficientSlides` → `centerInsufficientSlides`, `bounds` → `centeredSlidesBounds` |
| `group` | `perGroup` → `slidesPerGroup`, `skip` → `slidesPerGroupSkip`, `auto` → `slidesPerGroupAuto` |
| `touch` | `allow` → `allowTouchMove`, `simulate` → `simulateTouch`, `ratio` → `touchRatio`, `angle` → `touchAngle`, `releaseOnEdges` → `touchReleaseOnEdges`, `threshold`, `followFinger` |

```vue
<!-- these two are equivalent -->
<Surfer :loop="true" :loop-additional-slides="2" />
<Surfer :loop="{ additionalSlides: 2 }" />
```

## Breakpoints

`breakpoints` is an object of responsive overrides keyed by a **min-width in px** (`"640"`) or a **height ratio** (`"@0.75"`). Each value is a partial set of the flat layout params above (`loop`, `direction`, and `breakpoints` themselves cannot be overridden per breakpoint).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `breakpoints` | `{ [key: string]: BreakpointParams }` | — | Per-breakpoint param overrides |
| `breakpointsBase` | `'window' \| 'container'` | `'container'` | What the breakpoint keys measure against |

```vue
<Surfer
  :slides-per-view="1"
  :breakpoints="{
    640: { slidesPerView: 2, spaceBetween: 16 },
    1024: { slidesPerView: 4, spaceBetween: 24 },
  }"
/>
```
