# Composables

v-surfer ships three composables for working with the slider from the Composition API.

## `useSurfer()`

Grab the live **host** from anywhere inside a `<Surfer>` subtree.

```vue
<script setup>
import { useSurfer } from 'v-surfer'

const surfer = useSurfer()
function next() {
  surfer.next()
}
// surfer.state.value.activeIndex, surfer.state.value.isEnd, ...
</script>
```

The host exposes engine state (`state`), navigation methods (`next`, `prev`, `goTo`, `slideToLoop`, `slideToClosest`, …), the event API (`on`), and each active module's API (`modules.autoplay`, `modules.navigation`, …). Throws if called outside a `<Surfer>`.

## `useSurferHost()`

Build a host **externally** and hand it to `<Surfer :host>`. Useful when a parent needs to drive or observe the slider without being inside it.

```vue
<script setup>
import { useSurferHost, NavigationModule } from 'v-surfer'

const host = useSurferHost({
  slidesPerView: 1,
  spaceBetween: 16,
  modules: [NavigationModule],
})

// attach listeners (returns an unsubscribe fn)
const off = host.on('slideChange', () => {
  console.log('active', host.state.value.activeIndex)
})
</script>

<template>
  <Surfer :host="host">
    <Item v-for="n in 5" :key="n">{{ n }}</Item>
  </Surfer>
</template>
```

The host returned by `useSurferHost()` is typed against its `modules` list: `host.on()` only accepts event names and payloads that the listed modules (plus the core) can emit.

::: warning Lifecycle
When you pass an external `:host`, `<Surfer>` does **not** dispose it on unmount — you own its lifecycle. Call your `on()` unsubscribers (e.g. in `onUnmounted`) or `host.dispose()` when done.
:::

## `useSurferSlide()`

Inside an `<Item>` slot subtree, return the current slide's reactive flags. Use it when a deeper component needs slide state without threading slot props down.

```vue
<!-- SlideBadge.vue -->
<script setup>
import { useSurferSlide } from 'v-surfer'

const slide = useSurferSlide()
// slide.value.isActive, slide.value.isVisible, slide.value.index, ...
</script>

<template>
  <span v-if="slide.value.isActive" class="badge">Active</span>
</template>
```

```vue
<Surfer :slides-per-view="3">
  <Item v-for="n in 10" :key="n">
    <SlideBadge />
  </Item>
</Surfer>
```

Returns a `ComputedRef<ItemFlags>` — read `slide.value.*`. Throws if called outside an `<Item>` slot. The same flags are also available directly as `<Item>` scoped-slot props (see [Components](./components#item)).
