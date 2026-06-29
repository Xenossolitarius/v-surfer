# Navigation

Prev / next buttons. Module object `NavigationModule`, component `<Navigation>`, config key `navigation`.

## Usage

```vue
<script setup>
import { Surfer, Item, Navigation, NavigationModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/navigation'
</script>

<template>
  <Surfer :modules="[NavigationModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Navigation />
  </Surfer>
</template>
```

## Config parameters

Passed as `<Navigation>` props or via `:config="{ navigation: { … } }"`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Activate the module |
| `prevText` | `string` | — | Text content of the prev button |
| `nextText` | `string` | — | Text content of the next button |
| `hideOnClick` | `boolean` | `false` | Toggle button visibility on slider click |
| `hiddenClass` | `string` | `'v-surfer-button-hidden'` | Class applied when hidden |

## Component props

| Prop | Type | Default |
| --- | --- | --- |
| `prevText` | `string` | `undefined` |
| `nextText` | `string` | `undefined` |

## Slots

No slots.

## Host API

`host.modules.navigation` exposes the module's scoped emitter only (`{ emit }`); navigate via the host methods [`next()` / `prev()` / `goTo()`](/api/host#navigation-methods).

## Events

Delivered via `host.on()` and emitted on the `<Navigation>` component.

| Event | Payload | Fires when |
| --- | --- | --- |
| `navigationNext` | — | The next button activates |
| `navigationPrev` | — | The prev button activates |
| `navigationShow` | — | Buttons become visible (`hideOnClick`) |
| `navigationHide` | — | Buttons become hidden (`hideOnClick`) |

## Markup

```html
<div class="v-surfer-navigation">
  <button class="v-surfer-button-prev" type="button">…</button>
  <button class="v-surfer-button-next" type="button">…</button>
</div>
```

## CSS classes

| Class | Applied to |
| --- | --- |
| `v-surfer-navigation` | Wrapper element |
| `v-surfer-button-prev` / `v-surfer-button-next` | The buttons |
| `v-surfer-button-disabled` | A button at the edge (no loop/rewind) |
| `v-surfer-button-hidden` | Both buttons when hidden (`hideOnClick`) |

## CSS variables

| Variable | Purpose |
| --- | --- |
| `--v-surfer-navigation-color` | Button color |
| `--v-surfer-navigation-size` | Arrow size |
| `--v-surfer-navigation-top-offset` | Vertical position |
| `--v-surfer-navigation-sides-offset` | Horizontal inset |
| `--v-surfer-theme-color` | Inherited accent fallback |

## Example

```vue
<script setup>
import { Surfer, Item, Navigation, NavigationModule } from 'v-surfer'
import 'v-surfer/css'
import 'v-surfer/css/navigation'
</script>

<template>
  <Surfer
    :modules="[NavigationModule]"
    :slides-per-view="1"
    :config="{ navigation: { hideOnClick: true } }"
    style="--v-surfer-navigation-color: #0ca5b0"
  >
    <Item v-for="n in 6" :key="n">Slide {{ n }}</Item>
    <Navigation />
  </Surfer>
</template>
```
