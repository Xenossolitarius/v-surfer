# Effects

Transition effects are modules too — an `Effect*Module` object plus a component and a stylesheet.

## Usage

```vue
<script setup>
import { Surfer, Item, EffectFade, EffectFadeModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/effect-fade'
</script>

<template>
  <Surfer :modules="[EffectFadeModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <EffectFade />
  </Surfer>
</template>
```

Most effects assume one slide in view (`:slides-per-view="1"`).

## Available effects

| Module object | Component | CSS |
| --- | --- | --- |
| `EffectFadeModule` | `<EffectFade>` | `v-surfer/css/effect-fade` |
| `EffectFlipModule` | `<EffectFlip>` | `v-surfer/css/effect-flip` |
| `EffectCoverflowModule` | `<EffectCoverflow>` | `v-surfer/css/effect-coverflow` |
| `EffectCreativeModule` | `<EffectCreative>` | `v-surfer/css/effect-creative` |
| `EffectCubeModule` | `<EffectCube>` | `v-surfer/css/effect-cube` |
| `EffectCardsModule` | `<EffectCards>` | `v-surfer/css/effect-cards` |

## Options

Pass effect options via `:config`, keyed by the effect name:

```vue
<Surfer
  :modules="[EffectCoverflowModule]"
  :config="{ coverflow: { rotate: 50, depth: 100, modifier: 1, slideShadows: true } }"
>
  <Item v-for="n in 7" :key="n">{{ n }}</Item>
  <EffectCoverflow />
</Surfer>
```

Effects are mutually exclusive — activate one at a time.
