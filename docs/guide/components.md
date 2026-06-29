# Components

## `<Surfer>`

The slider root. It harvests `<Item>` children, drives the engine, and renders the container/wrapper/slides.

### Common props

`<Surfer>` forwards ~50 engine params as reactive props. The most common:

| Prop | Type | Description |
| --- | --- | --- |
| `slidesPerView` | `number \| 'auto'` | Slides visible at once. |
| `spaceBetween` | `number` | Gap between slides, in px. |
| `direction` | `'horizontal' \| 'vertical'` | Scroll axis. |
| `loop` | `boolean \| object` | Infinite looping. |
| `centeredSlides` | `boolean` | Center the active slide. |
| `freeMode` | `boolean \| object` | Momentum / free scrolling. |
| `speed` | `number` | Transition duration in ms. |
| `initialSlide` | `number` | Starting index. |
| `slidesPerGroup` | `number` | Slides advanced per swipe. |
| `autoHeight` | `boolean` | Size the wrapper to the active slide. |
| `rtl` | `boolean` | Right-to-left layout. |
| `virtual` | `boolean \| object` | Render only the visible window. |
| `cssMode` | `boolean` | Native CSS scroll-snap mode. |

Unset props fall through to the engine's own defaults — an unspecified prop is omitted from the param payload rather than sent as `undefined`.

Grouped object props are also accepted (`:centered`, `:group`, `:touch`, `:free-mode`, `:virtual`); a flat sibling prop always wins over the same key inside a group object.

### Modules & config

```vue
<Surfer :modules="[NavigationModule, AutoplayModule]" :config="{ autoplay: { delay: 2500 } }">
```

- `:modules` — the array of `*Module` objects to activate. See [Modules](./modules).
- `:config` — per-module options keyed by module name.

### Events

`<Surfer>` emits every core engine event as a Vue event:

```vue
<Surfer @slide-change="onChange" @reach-end="loadMore" />
```

See [Events](./events) for the full list and the programmatic `host.on()` API.

### Named slots

Four positional slots render around the slides, in addition to the default slot:

| Slot | Position |
| --- | --- |
| `container-start` | Inside the container, before the wrapper |
| `wrapper-start` | Inside the wrapper, before the slides |
| `wrapper-end` | Inside the wrapper, after the slides |
| `container-end` | Inside the container, after the wrapper |

```vue
<Surfer>
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <template #container-end>
    <div class="custom-overlay" />
  </template>
</Surfer>
```

Module components like `<Navigation />` and `<Pagination />` are just placed in the default slot — `<Surfer>` harvests them as "chrome" automatically.

## `<Item>`

Authors a single slide. `<Item>` renders nothing itself — `<Surfer>` harvests its template and renders it inside a `.v-surfer-slide` element with the engine's per-slide flags.

### Scoped-slot props

The default slot receives the slide's reactive flags:

| Prop | Type | Description |
| --- | --- | --- |
| `index` | `number` | Layout index (loop clones included). |
| `realIndex` | `number` | Original index in the source list. |
| `isActive` | `boolean` | The active slide. |
| `isPrev` / `isNext` | `boolean` | Adjacent to active. |
| `isVisible` | `boolean` | Any part is in view. |
| `isFullyVisible` | `boolean` | Entirely in view. |
| `data` | `unknown` | The `:data` prop value, passed through. |

```vue
<Item v-for="g in games" :key="g.id" :data="g" v-slot="{ isActive, data }">
  <GameCard :game="data" :featured="isActive" />
</Item>
```

For the same state via a composable in a deeper component, see [`useSurferSlide()`](./composables#usesurferslide).
