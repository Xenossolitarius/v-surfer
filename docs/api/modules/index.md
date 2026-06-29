# Modules

Every feature is two exports: a **`*Module`** object (engine behavior, passed to `<Surfer :modules>`) and a **component** (the DOM it renders, placed inside `<Surfer>`). The split keeps the engine tree-shakeable — import only the modules you use.

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

Options pass either as props on the component or via `<Surfer :config>` keyed by the module name. Each module's runtime API lives at `host.modules.<key>`.

| Module | Component | Config key | CSS | Purpose |
| --- | --- | --- | --- | --- |
| [Navigation](/api/modules/navigation) | `<Navigation>` | `navigation` | `v-surfer/css/navigation` | Prev / next buttons |
| [Pagination](/api/modules/pagination) | `<Pagination>` | `pagination` | `v-surfer/css/pagination` | Bullets / fraction / progressbar |
| [Scrollbar](/api/modules/scrollbar) | `<Scrollbar>` | `scrollbar` | `v-surfer/css/scrollbar` | Draggable scrollbar |
| [Keyboard](/api/modules/keyboard) | `<Keyboard>` | `keyboard` | — | Arrow-key control |
| [Mousewheel](/api/modules/mousewheel) | `<Mousewheel>` | `mousewheel` | — | Wheel control |
| [Controller](/api/modules/controller) | `<Controller>` | `controller` | — | Link sliders together |
| [Autoplay](/api/modules/autoplay) | `<Autoplay>` | `autoplay` | — | Auto-advance |
| [A11y](/api/modules/a11y) | `<A11y>` | `a11y` | `v-surfer/css/a11y` | ARIA roles & live region |

Transition effects are also modules — see [Effects](/api/effects).
