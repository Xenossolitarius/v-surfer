# Examples

A gallery of copy-pasteable recipes. Each is a complete `<script setup>` + `<template>` pair. Always import `'v-surfer/css'` once; add a feature stylesheet per module that needs one (see [Styling](/guide/styling)).

## Basic slider

```vue
<script setup>
import { Surfer, Item } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :slides-per-view="1" :space-between="16">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
  </Surfer>
</template>
```

## Navigation + Pagination

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
  <Surfer :modules="[NavigationModule, PaginationModule]" :slides-per-view="1">
    <Item v-for="n in 6" :key="n">Slide {{ n }}</Item>
    <Navigation />
    <Pagination :clickable="true" />
  </Surfer>
</template>
```

## Looping autoplay (pause on hover)

```vue
<script setup>
import { Surfer, Item, Autoplay, AutoplayModule } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer
    :modules="[AutoplayModule]"
    :loop="true"
    :slides-per-view="1"
    :config="{ autoplay: { delay: 2500, pauseOnMouseEnter: true } }"
  >
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Autoplay />
  </Surfer>
</template>
```

## Responsive breakpoints

`breakpoints` measure the container by default (`breakpointsBase: 'container'`).

```vue
<script setup>
import { Surfer, Item } from 'v-surfer'
import 'v-surfer/css'

const breakpoints = {
  640: { slidesPerView: 2, spaceBetween: 16 },
  1024: { slidesPerView: 4, spaceBetween: 24 },
}
</script>

<template>
  <Surfer :slides-per-view="1" :space-between="12" :breakpoints="breakpoints">
    <Item v-for="n in 10" :key="n">Slide {{ n }}</Item>
  </Surfer>
</template>
```

## Coverflow effect

```vue
<script setup>
import { Surfer, Item, EffectCoverflow, EffectCoverflowModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/effect-coverflow'
</script>

<template>
  <Surfer
    :modules="[EffectCoverflowModule]"
    :slides-per-view="'auto'"
    :centered-slides="true"
    :config="{ coverflow: { rotate: 50, depth: 100, modifier: 1, slideShadows: true } }"
  >
    <Item v-for="n in 7" :key="n">Slide {{ n }}</Item>
    <EffectCoverflow />
  </Surfer>
</template>
```

## Vertical free-mode

```vue
<script setup>
import { Surfer, Item } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/free-mode'
</script>

<template>
  <Surfer
    direction="vertical"
    :slides-per-view="3"
    :space-between="12"
    :free-mode="true"
    style="height: 320px"
  >
    <Item v-for="n in 12" :key="n">Slide {{ n }}</Item>
  </Surfer>
</template>
```

## Per-slide state

```vue
<script setup>
import { Surfer, Item } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :slides-per-view="3" :centered-slides="true">
    <Item v-for="n in 10" :key="n" v-slot="{ isActive, isVisible }">
      <div :class="{ active: isActive, dim: !isVisible }">Slide {{ n }}</div>
    </Item>
  </Surfer>
</template>
```

## Linked sliders (Controller)

Drive a second slider from a first by handing it the first slider's host.

```vue
<script setup>
import { ref } from 'vue'
import { Surfer, Item, ControllerModule } from 'v-surfer'
import 'v-surfer/css'

const main = ref()
</script>

<template>
  <Surfer :on-ready="(h) => (main = h)" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Main {{ n }}</Item>
  </Surfer>

  <Surfer
    v-if="main"
    :modules="[ControllerModule]"
    :slides-per-view="3"
    :config="{ controller: { control: main } }"
  >
    <Item v-for="n in 5" :key="n">Thumb {{ n }}</Item>
  </Surfer>
</template>
```

## External control with `useSurferHost()`

Build the host outside the slider to drive and observe it from a parent.

```vue
<script setup>
import { onUnmounted } from 'vue'
import { Surfer, Item, useSurferHost, NavigationModule } from 'v-surfer'
import 'v-surfer/css'

const host = useSurferHost({
  slidesPerView: 1,
  spaceBetween: 16,
  modules: [NavigationModule],
})

const off = host.on('slideChange', () => {
  console.log('active', host.state.value.activeIndex)
})

// You own an external host's lifecycle.
onUnmounted(() => {
  off()
  host.dispose()
})
</script>

<template>
  <Surfer :host="host">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
  </Surfer>
  <button @click="host.prev()">Prev</button>
  <button @click="host.next()">Next</button>
</template>
```

## Custom module

Author your own feature with [`defineSurferModule()`](/api/composables#definesurfermodule):

```ts
import { defineSurferModule } from 'v-surfer'

export const LoggerModule = defineSurferModule()('logger', ({ host }) => {
  const off = host.on('slideChange', () => console.log(host.activeIndex.value))
  return { stop: off }
})
```

```vue
<Surfer :modules="[LoggerModule]">
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
</Surfer>
```

See the [Guide](/guide/components) for deeper explanations and the [API Reference](/api/) for the full surface.
