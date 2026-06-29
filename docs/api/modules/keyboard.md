# Keyboard

Arrow-key (and Page Up/Down) control. Module object `KeyboardModule`, component `<Keyboard>`, config key `keyboard`. No rendered chrome.

## Usage

```vue
<script setup>
import { Surfer, Item, Keyboard, KeyboardModule } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :modules="[KeyboardModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Keyboard />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Keyboard>` props or via `:config="{ keyboard: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Activate keyboard control |
| `onlyInViewport` | `boolean` | `true` | Respond only when the slider is in view |
| `pageUpDown` | `boolean` | `true` | Allow PageUp / PageDown |
| `speed` | `number` | — | Transition speed for key navigation |

## Component props

| Prop | Type | Default |
| --- | --- | --- |
| `enabled` | `boolean` | `true` |
| `onlyInViewport` | `boolean` | `true` |
| `pageUpDown` | `boolean` | `true` |
| `speed` | `number` | `undefined` |

## Slots

No slots.

## Host API

`host.modules.keyboard` — `{ emit, enabled }`. `enabled` reflects the live on/off state.

## Events

| Event | Payload | Fires when |
| --- | --- | --- |
| `keyPress` | `number` | A handled navigation key is pressed (the key code) |

## Markup

No rendered markup.

## CSS classes

None.

## CSS variables

None.

## Example

```vue
<script setup>
import { Surfer, Item, Keyboard, KeyboardModule } from 'v-surfer'
import 'v-surfer/css'

function onKey(code) {
  console.log('navigated via key', code)
}
</script>

<template>
  <Surfer :modules="[KeyboardModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Keyboard :page-up-down="false" @key-press="onKey" />
  </Surfer>
</template>
```
