# API Reference

v-surfer publishes a Vue kit, a Nuxt module, and a set of CSS entry points. Everything you import from JavaScript comes from the main entry:

```ts
import { Surfer, Item, NavigationModule, useSurfer /* … */ } from 'v-surfer'
```

## Package entry points

| Entry | Import | Contents |
| --- | --- | --- |
| Main | `import { … } from 'v-surfer'` | Components, module objects, effects, composables, types |
| Nuxt | `import … from 'v-surfer/nuxt'` | The Nuxt module (used in `nuxt.config.ts`) |
| CSS | `import 'v-surfer/css'` | Stylesheets — see [Styling](/guide/styling) |

`'v-surfer'` and `'v-surfer/vue'` resolve to the same module.

## What's exported

```ts
// Components
Surfer, Item

// Module objects + their components
NavigationModule,  Navigation
PaginationModule,  Pagination
ScrollbarModule,   Scrollbar
KeyboardModule,    Keyboard
MousewheelModule,  Mousewheel
ControllerModule,  Controller
AutoplayModule,    Autoplay
A11yModule,        A11y

// Effect modules + their components
EffectFadeModule,      EffectFade
EffectFlipModule,      EffectFlip
EffectCoverflowModule, EffectCoverflow
EffectCreativeModule,  EffectCreative
EffectCubeModule,      EffectCube
EffectCardsModule,     EffectCards

// Composables
useSurfer, useSurferHost, useSurferSlide

// Custom-module authoring
defineSurferModule, injectHost, HOST_KEY

// Constants & types
CORE_EVENT_NAMES
type CoreHost, ModuleHost, TypedModuleHost, ModuleDef
type CoreEvents, HostEvents, ScopedEmit, ReactiveEngineParams
type ItemFlags
```

## Where does it live?

Reference entries are labelled by how you reach them:

| Term | Meaning |
| --- | --- |
| `<Surfer>` prop | Reactive prop on the component (also a `useSurferHost()` key) |
| Vue event | Emitted by `<Surfer>`; use `@event-name` |
| Slot | Named or scoped slot |
| Host property | Reactive member of the host (`useSurfer()` / `useSurferHost()` / `onReady`) |
| Host method | Callable member of the host |
| Module config | Option passed as a component prop or via `:config` |
| Module event | Delivered only through `host.on()` |
| Module API | Member of `host.modules.<key>` |

Engine parameters are documented once on [Parameters](/api/parameters); component-only props and slots on [Components](/api/components); the programmatic handle on [Host](/api/host).

## Pages

- [Parameters](/api/parameters) — every engine parameter, its type, and default
- [Components](/api/components) — `<Surfer>` behavioral props/slots/markup and `<Item>` scoped-slot props
- [Host](/api/host) — the live host object: reactive state, methods, and module APIs
- [Composables](/api/composables) — `useSurfer`, `useSurferHost`, `useSurferSlide`, and `defineSurferModule`
- [Events](/api/events) — the full core event surface and per-module events, with payloads
- [Modules](/api/modules/) — every module object, its component, config, API, events, and markup
- [Effects](/api/effects) — the six transition effects and their options

For task-oriented usage, start with the [Guide](/guide/components).
