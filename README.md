# v-surfer

A modern Vue 3 touch slider / carousel. Vue is the only public API:

```vue
<script setup>
import { Surfer, Item } from 'v-surfer';
import 'v-surfer/css';
</script>

<template>
  <Surfer :slides-per-view="1">
    <SurferSlide>Slide 1</Item>
    <SurferSlide>Slide 2</Item>
  </Surfer>
</template>
```

Opt into features via `v-surfer/modules` and their styles via `v-surfer/css/<module>`.

## Development & Testing

Tests run with Vitest 4 across three environments (each command builds first):

- `pnpm test:all` — everything (unit + ssr + browser)
- `pnpm test:unit` — happy-dom: API/behavior/module/effect + playground/demo/casino DOM snapshots
- `pnpm test:ssr` — node: `renderToString` (wrappers + casino SSR)
- `pnpm test:browser` — real Chromium (Vitest browser mode): layout, gestures, transitions, perf
- `pnpm test:coverage` — unit + ssr with v8 coverage (report in `test-results/coverage/`)
- `pnpm test:perf` — happy-dom JS-cost slide benchmarks → `test-results/perf.md`
- `pnpm check` — validate (oxlint + oxfmt) + coverage + browser

Snapshots live in `test/**/__snapshots__/` and are committed as the regression baseline.
Update intentionally with `pnpm exec vitest run -u`.
