---
layout: home

hero:
  name: v-surfer
  text: A Vue-native touch slider
  tagline: A DOM-free Slide engine with a Vue 3 component API. Headless engine, reactive component kit, Nuxt module.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/Xenossolitarius/v-surfer

features:
  - title: DOM-free engine
    details: All layout, geometry, looping, and gesture math run in a pure TypeScript engine with no DOM access. The Vue layer only renders and forwards events.
  - title: Vue-native API
    details: A real <Surfer> component with reactive props, scoped-slot per-slide state, named slots, and v-model-free two-way control — not a wrapper around a vanilla instance.
  - title: Tree-shakeable modules
    details: Navigation, Pagination, Scrollbar, Keyboard, Mousewheel, Controller, Autoplay, and A11y ship as opt-in modules. Import only what you use.
  - title: Six effects
    details: Fade, Flip, Coverflow, Creative, Cube, and Cards — each an opt-in module with its own stylesheet.
  - title: Composables
    details: useSurfer(), useSurferHost(), and useSurferSlide() give you the live host and per-slide reactive state anywhere in the tree.
  - title: SSR & Nuxt ready
    details: Hydration-stable server rendering out of the box, plus a Nuxt module that auto-registers every component and wires the CSS.
---
