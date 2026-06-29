# v-surfer

A modern Vue 3 touch slider / carousel — a DOM-free slider engine with a Vue-native component API.

## Install

```bash
npm install v-surfer
```

## Usage

Slides are authored with the `Item` component:

```vue
<script setup>
import { Surfer, Item } from 'v-surfer';
import 'v-surfer/css';
</script>

<template>
  <Surfer :slides-per-view="1" :space-between="16">
    <Item>Slide 1</Item>
    <Item>Slide 2</Item>
    <Item>Slide 3</Item>
  </Surfer>
</template>
```

## Modules

Opt into a feature by passing its module object to `:modules` and placing its
component inside the `<Surfer>`, then import the matching CSS:

```vue
<script setup>
import { Surfer, Item, Navigation, Pagination, NavigationModule, PaginationModule } from 'v-surfer';
import 'v-surfer/css';
import 'v-surfer/css/navigation';
import 'v-surfer/css/pagination';
</script>

<template>
  <Surfer :modules="[NavigationModule, PaginationModule]">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Navigation />
    <Pagination :clickable="true" />
  </Surfer>
</template>
```

## Nuxt

The Nuxt module auto-registers the components and wires the CSS:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['v-surfer/nuxt'],
});
```

## License

MIT
