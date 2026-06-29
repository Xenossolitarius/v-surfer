# Server-Side Rendering

v-surfer renders on the server out of the box and hydrates without mismatches.

## How it works

The engine needs no DOM and no layout to produce its initial state, so `<Surfer>` seeds its slides during `setup()` — on both server and client — and emits identical markup on each. No measurement runs on the server; the first real geometry pass happens on the client after mount, via a `ResizeObserver`.

Because slide content renders directly into each `.v-surfer-slide` element (the per-slide provider is a single-root component), the server HTML carries **no** extra wrapper elements or hydration fragment markers.

## Usage

No special configuration is required. Author the slider as usual:

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

This works in any SSR setup — Nuxt, `vite-ssr`, or a hand-rolled `renderToString`. For Nuxt specifically, see the [Nuxt guide](./nuxt).

## Notes

- Effects that rely on measured geometry (transforms, shadows) settle on the client after the first layout pass; the server emits the un-transformed first slide.
- Avoid forcing a fixed `:height` / `:width` that differs between server and client, which would cause a visible re-layout on hydration.
