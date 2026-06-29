# Mousewheel

Mouse-wheel / trackpad control. Module object `MousewheelModule`, component `<Mousewheel>`, config key `mousewheel`. No rendered chrome.

## Usage

```vue
<script setup>
import { Surfer, Item, Mousewheel, MousewheelModule } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :modules="[MousewheelModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Mousewheel />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Mousewheel>` props or via `:config="{ mousewheel: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Activate wheel control |
| `forceToAxis` | `boolean` | `false` | Ignore off-axis wheel deltas |
| `invert` | `boolean` | `false` | Invert direction |
| `sensitivity` | `number` | `1` | Delta multiplier |
| `releaseOnEdges` | `boolean` | `false` | Release the wheel at the edges (let the page scroll) |
| `thresholdDelta` | `number \| null` | `null` | Minimum delta to act |
| `thresholdTime` | `number \| null` | `null` | Minimum time between actions (ms) |
| `freeMode` | `boolean` | `false` | Free-scroll on wheel |
| `sticky` | `boolean` | `false` | Snap after a free-mode wheel |
| `noMousewheelClass` | `string` | `'v-surfer-no-mousewheel'` | Class that opts an element out |

## Component props

Same names and defaults as the config table above (each is a `<Mousewheel>` prop).

## Slots

No slots.

## Host API

`host.modules.mousewheel` — `{ emit, enabled }`. `enabled` reflects the live on/off state.

## Events

| Event | Payload | Fires when |
| --- | --- | --- |
| `scroll` | `WheelEvent` | A wheel event drives the slider |

## Markup

No rendered markup.

## CSS classes

`v-surfer-no-mousewheel` (configurable) — add it to any descendant to exclude it from wheel handling.

## CSS variables

None.

## Example

```vue
<script setup>
import { Surfer, Item, Mousewheel, MousewheelModule } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :modules="[MousewheelModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Mousewheel :force-to-axis="true" :sensitivity="1.2" />
  </Surfer>
</template>
```
