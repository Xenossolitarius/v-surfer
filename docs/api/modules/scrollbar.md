# Scrollbar

A draggable scrollbar. Module object `ScrollbarModule`, component `<Scrollbar>`, config key `scrollbar`.

## Usage

```vue
<script setup>
import { Surfer, Item, Scrollbar, ScrollbarModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/scrollbar'
</script>

<template>
  <Surfer :modules="[ScrollbarModule]" :slides-per-view="3">
    <Item v-for="n in 12" :key="n">Slide {{ n }}</Item>
    <Scrollbar />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Scrollbar>` props or via `:config="{ scrollbar: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `draggable` | `boolean` | `true` | Drag the scrollbar to scrub |
| `snapOnRelease` | `boolean` | `true` | Snap to the nearest slide on release |

## Component props

| Prop | Type | Default |
| --- | --- | --- |
| `draggable` | `boolean` | `undefined` (→ `true`) |
| `snapOnRelease` | `boolean` | `undefined` (→ `true`) |

## Slots

No slots.

## Host API

`host.modules.scrollbar` exposes the module's scoped emitter only (`{ emit }`).

## Events

| Event | Payload | Fires when |
| --- | --- | --- |
| `scrollbarDragStart` | `PointerEvent` | A scrollbar drag begins |
| `scrollbarDragMove` | `PointerEvent` | The scrollbar drag moves |
| `scrollbarDragEnd` | `PointerEvent` | The scrollbar drag ends |

## Markup

```html
<div class="v-surfer-scrollbar v-surfer-scrollbar-horizontal">
  <div class="v-surfer-scrollbar-drag"></div>
</div>
```

## CSS classes

| Class | Applied to |
| --- | --- |
| `v-surfer-scrollbar` | Track (+ `-horizontal` / `-vertical`) |
| `v-surfer-scrollbar-drag` | The draggable thumb |
| `v-surfer-scrollbar-lock` | Track when the slider is locked |

## CSS variables

| Variable | Purpose |
| --- | --- |
| `--v-surfer-scrollbar-bg-color` | Track background |
| `--v-surfer-scrollbar-drag-bg-color` | Thumb background |
| `--v-surfer-scrollbar-border-radius` | Track/thumb radius |
| `--v-surfer-scrollbar-size` | Track thickness |
| `--v-surfer-scrollbar-sides-offset` | Inset from the sides |
| `--v-surfer-scrollbar-top` / `-bottom` / `-left` / `-right` | Position |

## Example

```vue
<script setup>
import { Surfer, Item, Scrollbar, ScrollbarModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/scrollbar'
</script>

<template>
  <Surfer :modules="[ScrollbarModule]" :slides-per-view="3" :space-between="12">
    <Item v-for="n in 12" :key="n">Slide {{ n }}</Item>
    <Scrollbar :snap-on-release="false" />
  </Surfer>
</template>
```
