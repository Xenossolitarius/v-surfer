# Pagination

Bullets, fraction, or progressbar indicator. Module object `PaginationModule`, component `<Pagination>`, config key `pagination`.

## Usage

```vue
<script setup>
import { Surfer, Item, Pagination, PaginationModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/pagination'
</script>

<template>
  <Surfer :modules="[PaginationModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Pagination :clickable="true" />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Pagination>` props or via `:config="{ pagination: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `'bullets' \| 'fraction' \| 'progressbar'` | `'bullets'` | Indicator style |
| `clickable` | `boolean` | `true` | Jump to a slide on bullet click |
| `slidesPerGroup` | `number` | `1` | Slides represented per bullet |
| `hideOnClick` | `boolean` | `false` | Toggle visibility on slider click |
| `hiddenClass` | `string` | `'v-surfer-pagination-hidden'` | Class applied when hidden |

## Component props

| Prop | Type | Default |
| --- | --- | --- |
| `type` | `'bullets' \| 'fraction' \| 'progressbar'` | `undefined` (→ `'bullets'`) |
| `clickable` | `boolean` | `undefined` (→ `true`) |
| `slidesPerGroup` | `number` | `undefined` (→ `1`) |

## Slots

No slots.

## Host API

`host.modules.pagination` exposes the module's scoped emitter only (`{ emit }`). Read indices from [host state](/api/host#reactive-state) (`snapIndex`, `activeIndex`).

## Events

| Event | Payload | Fires when |
| --- | --- | --- |
| `paginationRender` | `HTMLElement` | The pagination root first renders |
| `paginationUpdate` | `HTMLElement` | The pagination re-renders on change |
| `paginationShow` | — | Becomes visible (`hideOnClick`) |
| `paginationHide` | — | Becomes hidden (`hideOnClick`) |

## Markup

Bullets (default):

```html
<div class="v-surfer-pagination v-surfer-pagination-bullets">
  <span class="v-surfer-pagination-bullet v-surfer-pagination-bullet-active"></span>
  <span class="v-surfer-pagination-bullet"></span>
</div>
```

Fraction:

```html
<div class="v-surfer-pagination v-surfer-pagination-fraction">
  <span class="v-surfer-pagination-current">1</span> / <span class="v-surfer-pagination-total">5</span>
</div>
```

Progressbar:

```html
<div class="v-surfer-pagination v-surfer-pagination-progressbar">
  <span class="v-surfer-pagination-progressbar-fill"></span>
</div>
```

## CSS classes

| Class | Applied to |
| --- | --- |
| `v-surfer-pagination` | Root (+ `-bullets` / `-fraction` / `-progressbar`) |
| `v-surfer-pagination-bullet` | A bullet (active adds `v-surfer-pagination-bullet-active`) |
| `v-surfer-pagination-current` / `v-surfer-pagination-total` | Fraction numbers |
| `v-surfer-pagination-progressbar-fill` | Progressbar fill |
| `v-surfer-pagination-hidden` | Root when hidden (`hideOnClick`) |

## CSS variables

| Variable | Purpose |
| --- | --- |
| `--v-surfer-pagination-color` | Active bullet / accent color |
| `--v-surfer-pagination-bullet-size` | Bullet size |
| `--v-surfer-pagination-bullet-width` / `-height` | Explicit bullet dimensions |
| `--v-surfer-pagination-bullet-border-radius` | Bullet radius |
| `--v-surfer-pagination-bullet-horizontal-gap` / `-vertical-gap` | Gaps between bullets |
| `--v-surfer-pagination-bullet-opacity` | Active bullet opacity |
| `--v-surfer-pagination-bullet-inactive-color` / `-inactive-opacity` | Inactive bullet styling |
| `--v-surfer-pagination-left` / `-right` / `-top` / `-bottom` | Position |
| `--v-surfer-pagination-fraction-color` | Fraction text color |
| `--v-surfer-pagination-progressbar-size` / `-bg-color` | Progressbar styling |

## Example

```vue
<script setup>
import { Surfer, Item, Pagination, PaginationModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/pagination'
</script>

<template>
  <Surfer :modules="[PaginationModule]" :slides-per-view="1">
    <Item v-for="n in 8" :key="n">Slide {{ n }}</Item>
    <Pagination type="fraction" />
  </Surfer>
</template>
```
