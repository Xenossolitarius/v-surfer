# Quick Start

## A minimal slider

Slides are authored with `<Item>`. Import the core stylesheet once.

```vue
<script setup>
import { Surfer, Item } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :slides-per-view="1" :space-between="16">
    <Item>Slide 1</Item>
    <Item>Slide 2</Item>
    <Item>Slide 3</Item>
  </Surfer>
</template>
```

## Adding features

Every feature is a module. Pass its `*Module` object to `:modules`, place the matching component inside `<Surfer>`, and import its stylesheet.

```vue
<script setup>
import {
  Surfer, Item,
  Navigation, Pagination,
  NavigationModule, PaginationModule,
} from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/navigation'
import 'v-surfer/css/pagination'
</script>

<template>
  <Surfer :modules="[NavigationModule, PaginationModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Navigation />
    <Pagination :clickable="true" />
  </Surfer>
</template>
```

The split is deliberate: the `*Module` object registers the feature's engine behavior (passed to `:modules`), while the component (`<Navigation />`) renders its DOM where you place it.

## Per-slide state

`<Item>` exposes its slide's reactive flags as scoped-slot props:

```vue
<template>
  <Surfer :slides-per-view="3">
    <Item v-for="n in 10" :key="n" v-slot="{ isActive, isVisible }">
      <div :class="{ active: isActive, dim: !isVisible }">Slide {{ n }}</div>
    </Item>
  </Surfer>
</template>
```

See [Composables](/guide/composables) for the `useSurferSlide()` form, and [Components](/guide/components) for the full prop and slot surface.
