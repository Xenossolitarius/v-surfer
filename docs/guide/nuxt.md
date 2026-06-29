# Nuxt

v-surfer ships a Nuxt module that auto-registers every component and wires the CSS.

## Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['v-surfer/nuxt'],
})
```

That's it — `@nuxt/kit` is an optional peer dependency the module needs at build time; install it if your Nuxt setup doesn't already provide it.

## What it does

- **Auto-imports the components** — `<Surfer>`, `<Item>`, and every module/effect component are globally available with no manual import. By default they keep their names; the `Surfer` component is also exposed under your configured prefix.
- **Auto-imports the module objects** — `NavigationModule`, `AutoplayModule`, `EffectFadeModule`, … are available without importing. Unused ones are tree-shaken by Nuxt.
- **Injects the CSS** — the core stylesheet (and, by default, the feature sheets) are added to the build.

```vue
<template>
  <!-- No imports needed -->
  <Surfer :modules="[NavigationModule]" :slides-per-view="1">
    <Item v-for="n in 5" :key="n">Slide {{ n }}</Item>
    <Navigation />
  </Surfer>
</template>
```

## Options

The module is configured under the `vSurfer` key:

```ts
export default defineNuxtConfig({
  modules: ['v-surfer/nuxt'],
  vSurfer: {
    prefix: 'Surfer',   // component name prefix: root <Surfer>, others <Surfer{Name}>
    components: true,    // auto-register components (default true)
    css: true,          // true = all CSS, false = none, or string[] of feature names
    effects: 'all',     // 'all' or a string[] of effect names to include
  },
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `prefix` | `string` | `'Surfer'` | Root is `<Surfer>`; others are `<Surfer{Name}>`. |
| `components` | `boolean` | `true` | Auto-register the kit components. |
| `css` | `boolean \| string[]` | `true` | `true` ships all CSS, `false` none, a `string[]` is an explicit feature list (core always included). |
| `effects` | `'all' \| string[]` | `'all'` | Which effect stylesheets to include when `css` is `true`. |

See the [API reference](/api/) for the resolved component and import surface.
