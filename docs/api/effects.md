# Effects

Transition effects are modules: an `Effect*Module` object plus a component and a stylesheet. They are **mutually exclusive** — activate one at a time — and most assume `slidesPerView: 1`. Options are passed via `<Surfer :config>` keyed by the effect name. None of the effect stylesheets expose CSS custom properties; tune them through their config options.

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

| Effect | Module / component | Config key | Stylesheet |
| --- | --- | --- | --- |
| Fade | `EffectFadeModule` / `<EffectFade>` | `fade` | `v-surfer/css/effect-fade` |
| Flip | `EffectFlipModule` / `<EffectFlip>` | `flip` | `v-surfer/css/effect-flip` |
| Coverflow | `EffectCoverflowModule` / `<EffectCoverflow>` | `coverflow` | `v-surfer/css/effect-coverflow` |
| Creative | `EffectCreativeModule` / `<EffectCreative>` | `creative` | `v-surfer/css/effect-creative` |
| Cube | `EffectCubeModule` / `<EffectCube>` | `cube` | `v-surfer/css/effect-cube` |
| Cards | `EffectCardsModule` / `<EffectCards>` | `cards` | `v-surfer/css/effect-cards` |

## Fade

Cross-dissolve between slides.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `crossFade` | `boolean` | `false` | Fade the outgoing slide out as the next fades in (vs. stacking) |

```vue
<Surfer :modules="[EffectFadeModule]" :slides-per-view="1" :config="{ fade: { crossFade: true } }">
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <EffectFade />
</Surfer>
```

No CSS custom properties.

## Flip

3D flip between slides.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slideShadows` | `boolean` | `true` | Render shadows on the flipping faces |
| `limitRotation` | `boolean` | `true` | Clamp rotation to ±90° |

```vue
<Surfer :modules="[EffectFlipModule]" :slides-per-view="1" :config="{ flip: { slideShadows: true } }">
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <EffectFlip />
</Surfer>
```

No CSS custom properties.

## Coverflow

3D coverflow with depth and rotation.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rotate` | `number` | `50` | Rotation of side slides (°) |
| `stretch` | `number` | `0` | Space between slides (px) |
| `depth` | `number` | `100` | Z-axis depth offset (px) |
| `scale` | `number` | `1` | Scale of side slides |
| `modifier` | `number` | `1` | Multiplier applied to the effect |
| `slideShadows` | `boolean` | `true` | Render edge shadows |

```vue
<Surfer
  :modules="[EffectCoverflowModule]"
  :slides-per-view="'auto'"
  :centered-slides="true"
  :config="{ coverflow: { rotate: 50, depth: 100, modifier: 1, slideShadows: true } }"
>
  <Item v-for="n in 7" :key="n">{{ n }}</Item>
  <EffectCoverflow />
</Surfer>
```

No CSS custom properties.

## Creative

Fully custom per-slide transforms for the incoming (`next`) and outgoing (`prev`) slides.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `limitProgress` | `number` | `1` | How many slides ahead/behind receive the transform |
| `shadowPerProgress` | `boolean` | `false` | Scale shadow opacity with progress |
| `progressMultiplier` | `number` | `1` | Multiplier applied to progress |
| `perspective` | `boolean` | `true` | Apply 3D perspective (adds `v-surfer-3d`) |
| `prev` | `object` | `{ translate: [0,0,0], rotate: [0,0,0], opacity: 1, scale: 1 }` | Transform for the outgoing slide |
| `next` | `object` | `{ translate: [0,0,0], rotate: [0,0,0], opacity: 1, scale: 1 }` | Transform for the incoming slide |

`translate` and `rotate` are `[x, y, z]` tuples (translate in px, rotate in °).

```vue
<Surfer
  :modules="[EffectCreativeModule]"
  :slides-per-view="1"
  :config="{
    creative: {
      prev: { translate: ['-20%', 0, -1], opacity: 0 },
      next: { translate: ['100%', 0, 0] },
    },
  }"
>
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <EffectCreative />
</Surfer>
```

No CSS custom properties.

## Cube

3D cube rotation.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slideShadows` | `boolean` | `true` | Render shadows on the cube faces |
| `shadow` | `boolean` | `true` | Render the floor shadow under the cube |
| `shadowOffset` | `number` | `20` | Floor-shadow offset (px) |
| `shadowScale` | `number` | `0.94` | Floor-shadow scale |

```vue
<Surfer :modules="[EffectCubeModule]" :slides-per-view="1" :config="{ cube: { shadow: true, shadowOffset: 20 } }">
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <EffectCube />
</Surfer>
```

No CSS custom properties.

## Cards

Stacked-cards effect, swiping the top card away.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slideShadows` | `boolean` | `true` | Render shadows on stacked cards |
| `rotate` | `boolean` | `true` | Rotate cards in the stack |
| `perSlideRotate` | `number` | `2` | Rotation added per card in the stack (°) |
| `perSlideOffset` | `number` | `8` | Offset added per card in the stack (px) |

```vue
<Surfer :modules="[EffectCardsModule]" :slides-per-view="1" :config="{ cards: { perSlideOffset: 8, perSlideRotate: 2 } }">
  <Item v-for="n in 5" :key="n">{{ n }}</Item>
  <EffectCards />
</Surfer>
```

No CSS custom properties.
