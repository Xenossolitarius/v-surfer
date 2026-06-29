# Styling

## Stylesheets

v-surfer ships CSS as separate, opt-in entry points. Always import the core sheet; add a feature sheet for each module that needs one.

```ts
import 'v-surfer/css'              // core layout (required)
import 'v-surfer/css/navigation'   // per-feature chrome
import 'v-surfer/css/pagination'
import 'v-surfer/css/effect-fade'
```

| Entry | Covers |
| --- | --- |
| `v-surfer/css` | Everything (core + all chrome + effects) |
| `v-surfer/css/core` | Core layout only |
| `v-surfer/css/navigation` | Prev / next buttons |
| `v-surfer/css/pagination` | Bullets / fraction / progress |
| `v-surfer/css/scrollbar` | Scrollbar |
| `v-surfer/css/a11y` | Screen-reader-only helpers |
| `v-surfer/css/free-mode` | Free-mode cursor |
| `v-surfer/css/effect-{fade,flip,coverflow,creative,cube,cards}` | Per effect |

`v-surfer/css` is the everything-bundle; importing it alone is enough if you don't care about granularity.

## Class names

Elements carry `v-surfer-`-prefixed classes you can target:

- `.v-surfer` — the container (with `.v-surfer-horizontal` / `.v-surfer-vertical`, `.v-surfer-rtl`, etc.)
- `.v-surfer-wrapper` — the flex track
- `.v-surfer-slide` — each slide, plus state classes `.v-surfer-slide-active`, `-prev`, `-next`, `-visible`, `-fully-visible`
- `.v-surfer-button-prev` / `.v-surfer-button-next`, `.v-surfer-pagination`, `.v-surfer-scrollbar`, …

CSS custom properties use the `--v-surfer-` prefix. Each feature exposes its own — for example navigation and pagination:

```css
.v-surfer {
  --v-surfer-navigation-color: #007aff;
  --v-surfer-navigation-size: 28px;
  --v-surfer-pagination-color: #007aff;
  --v-surfer-pagination-bullet-size: 10px;
}
```

Override them on the container (or any ancestor) to theme a slider without touching the shipped stylesheets.
