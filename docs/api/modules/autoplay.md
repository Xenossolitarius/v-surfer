# Autoplay

Auto-advance the slider on a timer. Module object `AutoplayModule`, component `<Autoplay>`, config key `autoplay`. No rendered chrome.

## Usage

```vue
<script setup>
import { Surfer, Item, Autoplay, AutoplayModule } from 'v-surfer'
import 'v-surfer/css'
</script>

<template>
  <Surfer :modules="[AutoplayModule]" :loop="true" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Autoplay />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Autoplay>` props or via `:config="{ autoplay: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Start playing on init |
| `delay` | `number` | `3000` | Delay between slides (ms) |
| `reverseDirection` | `boolean` | `false` | Play backwards |
| `stopOnLastSlide` | `boolean` | `false` | Stop at the end (when not looping) |
| `disableOnInteraction` | `boolean` | `false` | Stop permanently on user interaction |
| `pauseOnMouseEnter` | `boolean` | `false` | Pause while hovered |
| `waitForTransition` | `boolean` | `true` | Count the delay only after a transition ends |

## Component props

Same names and defaults as the config table above (each is an `<Autoplay>` prop).

## Slots

No slots.

## Host API

`host.modules.autoplay`:

| Member | Type | Description |
| --- | --- | --- |
| `running` | `boolean` | Currently advancing |
| `paused` | `boolean` | Temporarily paused |
| `timeLeft` | `number` | ms until the next slide |
| `start()` | `() => void` | Start autoplay |
| `stop()` | `() => void` | Stop autoplay |
| `pause()` | `() => void` | Pause the timer |
| `resume()` | `() => void` | Resume the timer |

## Events

| Event | Payload | Fires when |
| --- | --- | --- |
| `autoplay` | — | Each auto-advance |
| `autoplayStart` | — | Autoplay starts |
| `autoplayStop` | — | Autoplay stops |
| `autoplayPause` | — | The timer pauses |
| `autoplayResume` | — | The timer resumes |
| `autoplayTimeLeft` | `{ timeLeft: number; percentage: number }` | On each tick |

## Markup

No rendered markup.

## CSS classes

None.

## CSS variables

None.

## Example

```vue
<script setup>
import { ref } from 'vue'
import { Surfer, Item, Autoplay, AutoplayModule } from 'v-surfer'
import 'v-surfer/css'

const host = ref()
</script>

<template>
  <Surfer
    :modules="[AutoplayModule]"
    :loop="true"
    :slides-per-view="1"
    :on-ready="(h) => (host = h)"
    :config="{ autoplay: { delay: 2500, pauseOnMouseEnter: true } }"
  >
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Autoplay />
  </Surfer>
  <button @click="host.modules.autoplay.stop()">Stop</button>
  <button @click="host.modules.autoplay.start()">Start</button>
</template>
```
