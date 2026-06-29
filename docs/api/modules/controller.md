# Controller

Link one slider to one or more others so they move together. Module object `ControllerModule`, component `<Controller>`, config key `controller`. No rendered chrome.

## Usage

```vue
<script setup>
import { ref } from 'vue'
import { Surfer, Item, Controller, ControllerModule } from 'v-surfer'
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
    <Controller :control="main" />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Controller>` props or via `:config="{ controller: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `control` | `ModuleHost \| Engine \| (ModuleHost \| Engine)[]` | — | Slider(s) to drive (required) |
| `by` | `'slide' \| 'container'` | `'slide'` | Sync by slide index or by translate |
| `inverse` | `boolean` | `false` | Mirror the direction |
| `twoWay` | `boolean` | `false` | Each slider drives the other |
| `enabled` | `boolean` | `true` | Activate the link |

## Component props

| Prop | Type | Default |
| --- | --- | --- |
| `control` | `ModuleHost \| Engine \| (…)[]` | required |
| `by` | `'slide' \| 'container'` | `'slide'` |
| `inverse` | `boolean` | `false` |
| `twoWay` | `boolean` | `false` |
| `enabled` | `boolean` | `true` |

Pass a host from [`onReady`](/api/components#behavioral-props) or [`useSurferHost()`](/api/composables#usesurferhost) as `control`.

## Slots

No slots.

## Host API

No `host.modules.controller` API surface — the link is wired internally from the config.

## Events

No module-specific events.

## Markup

No rendered markup.

## CSS classes

None.

## CSS variables

None.

## Example

```vue
<script setup>
import { Surfer, Item, useSurferHost, Controller, ControllerModule } from 'v-surfer'
import 'v-surfer/css'

const gallery = useSurferHost({ slidesPerView: 1 })
</script>

<template>
  <Surfer :host="gallery">
    <Item v-for="n in 6" :key="n">Photo {{ n }}</Item>
  </Surfer>

  <Surfer
    :modules="[ControllerModule]"
    :slides-per-view="4"
    :config="{ controller: { control: gallery, twoWay: true } }"
  >
    <Item v-for="n in 6" :key="n">Thumb {{ n }}</Item>
    <Controller :control="gallery" :two-way="true" />
  </Surfer>
</template>
```
