# Introduction

**v-surfer** is a Vue 3 touch slider / carousel. It pairs a DOM-free slider engine with a Vue-native component API.

## Why v-surfer?

The slider's entire model — layout, slide geometry, looping, free-mode momentum, breakpoints, gesture resolution — lives in a pure TypeScript engine that never touches the DOM. The Vue layer is a thin renderer on top: it maps engine state to elements, forwards pointer and resize events into the engine, and applies the resulting classes and transforms.

- **DOM-free engine** — the hard math is testable in isolation and framework-independent.
- **A real component, not a wrapper** — `<Surfer>` is a Vue component with reactive props, scoped-slot per-slide state, and named slots. There is no imperative slider instance to manage.
- **Opt-in everything** — features (navigation, pagination, autoplay, effects, …) are tree-shakeable modules. A minimal slider ships almost nothing extra.
- **SSR-safe** — server rendering is hydration-stable; no layout is required on the server.

## Prerequisites

- **Node.js** `^20.19.0 || >=22.12.0` (see `.nvmrc`)
- **Vue 3.3+** as a peer dependency

## Installation

```bash
npm install v-surfer
# or
pnpm add v-surfer
```

`vue` is a required peer dependency. `@nuxt/kit` is an optional peer (only needed if you use the Nuxt module).

## What you get

- **`<Surfer>`** — the slider component, with ~50 reactive engine props.
- **`<Item>`** — the slide authoring component, exposing per-slide state as scoped-slot props.
- **Modules** — `Navigation`, `Pagination`, `Scrollbar`, `Keyboard`, `Mousewheel`, `Controller`, `Autoplay`, `A11y`, each with a matching `*Module` object.
- **Effects** — `EffectFade`, `EffectFlip`, `EffectCoverflow`, `EffectCreative`, `EffectCube`, `EffectCards`.
- **Composables** — `useSurfer()`, `useSurferHost()`, `useSurferSlide()`, plus `defineSurferModule()` for custom modules.
- **A Nuxt module** at `v-surfer/nuxt`.

Continue to the [Quick Start](./quick-start).
