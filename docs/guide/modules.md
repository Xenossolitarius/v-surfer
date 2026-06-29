# Modules

Features are opt-in modules. Each one is two exports:

- a **`*Module`** object — the engine behavior, passed to `:modules`;
- a **component** — the DOM it renders, placed inside `<Surfer>`.

This split keeps the engine tree-shakeable: import only the modules you use, and only their code is bundled.

## Usage

```vue
<script setup>
import {
  Surfer, Item,
  Navigation, NavigationModule,
  Pagination, PaginationModule,
} from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/navigation'
import 'v-surfer/css/pagination'
</script>

<template>
  <Surfer :modules="[NavigationModule, PaginationModule]">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Navigation />
    <Pagination :clickable="true" />
  </Surfer>
</template>
```

Per-module options can be passed either as props on the component or via `<Surfer :config>`:

```vue
<Surfer :modules="[AutoplayModule]" :config="{ autoplay: { delay: 3000, pauseOnMouseEnter: true } }">
```

## Available modules

| Module object | Component | CSS | Purpose |
| --- | --- | --- | --- |
| `NavigationModule` | `<Navigation>` | `v-surfer/css/navigation` | Prev / next buttons |
| `PaginationModule` | `<Pagination>` | `v-surfer/css/pagination` | Bullets / fraction / progress |
| `ScrollbarModule` | `<Scrollbar>` | `v-surfer/css/scrollbar` | Draggable scrollbar |
| `KeyboardModule` | `<Keyboard>` | — | Arrow-key control |
| `MousewheelModule` | `<Mousewheel>` | — | Wheel control |
| `ControllerModule` | `<Controller>` | — | Link sliders together |
| `AutoplayModule` | `<Autoplay>` | — | Auto-advance |
| `A11yModule` | `<A11y>` | `v-surfer/css/a11y` | ARIA roles & live regions |

Components without a CSS entry (Keyboard, Mousewheel, Controller, Autoplay) add no styles of their own.

## Module APIs & events

Some modules expose an imperative API and emit events. Reach them via the [host](./composables#usesurferhost):

```vue
<script setup>
import { ref } from 'vue'
import { Surfer, Item, Autoplay, AutoplayModule } from 'v-surfer'

const host = ref()
function pause() {
  host.value.modules.autoplay.stop()
}
</script>

<template>
  <Surfer :modules="[AutoplayModule]" :on-ready="(h) => (host = h)">
    <Item v-for="n in 5" :key="n">{{ n }}</Item>
    <Autoplay />
  </Surfer>
  <button @click="pause">Pause</button>
</template>
```

Each module's events (e.g. `autoplayStart`, `navigationNext`, `paginationUpdate`) land on the same event bus as core events — subscribe with `host.on(name, handler)`. See [Events](./events).

## Custom modules

`defineSurferModule()` lets you author your own. See the [API reference](/api/composables#definesurfermodule).
