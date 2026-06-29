# Components

## `<Surfer>`

The slider root. It harvests `<Item>` children, owns (or accepts) the host, drives the engine, and renders the container → wrapper → slides. For task-level usage see the [Components guide](/guide/components).

### Engine props

`<Surfer>` forwards ~50 reactive engine parameters (`slidesPerView`, `loop`, `freeMode`, `centeredSlides`, …), each defaulting to `undefined` so the engine's own default applies. They are documented in full — with types and defaults — on **[Parameters](/api/parameters)**, including the grouped object forms (`loop`, `freeMode`, `virtual`, `centered`, `group`, `touch`) and `breakpoints`.

### Behavioral props

These are kit / DOM-glue props, not engine params.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `host` | `ModuleHost` | `undefined` | An externally-built host (see [`useSurferHost`](/api/composables#usesurferhost)). When set, `<Surfer>` does **not** dispose it. |
| `modules` | `ModuleDef[]` | `undefined` | Module objects to activate |
| `config` | `Record<string, object>` | `undefined` | Per-module options, keyed by module name |
| `onReady` | `(host: ModuleHost) => void` | `undefined` | Called once after the first slide pass, with the live host |
| `tag` | `string` | `'div'` | Container element tag |
| `wrapperTag` | `string` | `'div'` | Wrapper element tag |
| `grabCursor` | `boolean` | `false` | Show the grab cursor |
| `focusableElements` | `string` | `'input, select, option, textarea, button, video, label'` | Selector a gesture must not hijack |
| `noSwiping` | `boolean \| object` | `true` | Disable swiping on matching elements |
| `noSwipingClass` | `string` | `'v-surfer-no-swiping'` | Class for `noSwiping` |
| `noSwipingSelector` | `string` | `''` | Selector for `noSwiping` |
| `preventClicks` | `boolean \| object` | `true` | Swallow clicks fired during a drag |
| `preventClicksPropagation` | `boolean` | `true` | Stop propagation of swallowed clicks |
| `breakpoints` | `object` | `undefined` | Responsive param overrides |
| `breakpointsBase` | `'window' \| 'container'` | `'container'` | What breakpoints measure against |
| `height` / `width` | `number \| null` | `null` | Fixed dimensions (px) |
| `resizeObserver` | `boolean` | `true` | Re-measure on container resize |
| `touchMoveStopPropagation` | `boolean` | `false` | Stop propagation of `touchmove` |
| `touchStartPreventDefault` | `boolean` | `true` | `preventDefault` on `touchstart` |
| `touchStartForcePreventDefault` | `boolean` | `false` | Force the above even on form fields |

### Events

`<Surfer>` emits every name in `CORE_EVENT_NAMES` as a Vue event (camelCase export, kebab-case in templates):

```vue
<Surfer @slide-change="onChange" @reach-end="loadMore" @progress="onProgress" />
```

Module events (autoplay, navigation, …) are **not** forwarded as Vue events — subscribe via `host.on()`. See [Events](/api/events).

### Slots

| Slot | Position |
| --- | --- |
| default | Slides (`<Item>`) and module chrome |
| `container-start` | Inside the container, before the wrapper |
| `wrapper-start` | Inside the wrapper, before the slides |
| `wrapper-end` | Inside the wrapper, after the slides |
| `container-end` | Inside the container, after the wrapper |

Module components (`<Navigation>`, `<Pagination>`, …) go in the default slot — `<Surfer>` harvests them as chrome automatically.

### Markup

```html
<div class="v-surfer v-surfer-horizontal">
  <div class="v-surfer-wrapper">
    <div class="v-surfer-slide v-surfer-slide-active">…</div>
    <div class="v-surfer-slide">…</div>
  </div>
  <!-- module chrome (navigation, pagination, scrollbar) renders here -->
</div>
```

The container gains a modifier class per active option: `v-surfer-vertical`, `v-surfer-rtl`, `v-surfer-autoheight`, `v-surfer-centered`, `v-surfer-free-mode`, `v-surfer-css-mode`, or `v-surfer-virtual` (the default axis is `v-surfer-horizontal`). Each slide carries the per-slide state classes `v-surfer-slide-active`, `-prev`, `-next`, `-visible`, and `-fully-visible`. See [Styling](/guide/styling) for the full class and CSS-variable list.

## `<Item>`

Authors a single slide. It renders nothing itself; `<Surfer>` harvests its template and renders it inside a `.v-surfer-slide` element.

### Props

| Prop | Type | Description |
| --- | --- | --- |
| `data` | `unknown` | Arbitrary value passed straight through to the slot as `data` |

### Scoped-slot props (`ItemFlags`)

| Prop | Type | Description |
| --- | --- | --- |
| `index` | `number` | Layout index (loop clones included) |
| `realIndex` | `number` | Original index in the source list |
| `isActive` | `boolean` | The active slide |
| `isPrev` | `boolean` | Slide immediately before active |
| `isNext` | `boolean` | Slide immediately after active |
| `isVisible` | `boolean` | Any part is in view |
| `isFullyVisible` | `boolean` | Entirely in view |
| `data` | `unknown` | The `:data` prop value |

```vue
<Item v-for="g in games" :key="g.id" :data="g" v-slot="{ isActive, data }">
  <GameCard :game="data" :featured="isActive" />
</Item>
```

The same flags are available in a deeper component via [`useSurferSlide()`](/api/composables#usesurferslide).
