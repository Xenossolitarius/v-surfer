Final frozen-vs-kit performance snapshot, captured before the frozen oracle was removed (2026-06-26). The frozen-vs-kit benchmarks were deleted after this snapshot.

# surfer perf report

> Client timings run in jsdom — they measure surfer JS/DOM-construction cost (regression-oriented), not real browser paint/FPS. SSR renderToString timings are real.

## Client (jsdom): virtual vs non-virtual

| slides | non-virtual ms | virtual ms | non-virtual nodes | virtual nodes |
|---|---|---|---|---|
| 1000 | 60.4 | 3.8 | 1000 | 4 |
| 2000 | 91.2 | 2.0 | 2000 | 4 |
| 5000 | 208.3 | 2.1 | 5000 | 4 |

## SSR (node): frozen shipped dist — renderToString

| slides | render ms | slides in html |
|---|---|---|
| 1000 | 34.9 | 1000 |
| 1000 | 21.6 | 1000 |
| 1000 | 4.6 | 1002 |
| 2000 | 68.3 | 2000 |
| 2000 | 26.2 | 2000 |
| 2000 | 2.0 | 2002 |
| 5000 | 116.1 | 5000 |
| 5000 | 59.2 | 5000 |
| 5000 | 4.4 | 5002 |

## SSR parity (node, from source): frozen vs kit — renderToString

> Both implementations rendered from `src/` with identical params, so the only variable is the architecture (frozen DOM-coupled vs kit DOM-free engine). Median of 3 runs after one warmup. ratio = kit / frozen (lower is better for the kit).

| slides | frozen ms | kit ms | ratio (kit/frozen) |
|---|---|---|---|
| 1000 | 16.2 | 2.3 | 0.14× |
| 2000 | 25.9 | 5.0 | 0.19× |
| 5000 | 48.5 | 4.3 | 0.09× |

---

# surfer real-browser perf report

> Real headless-Chromium timings. Budgets are regression-oriented, not tight bounds.

## Init (Chromium): virtual vs non-virtual

| slides | variant | ms | heap MB | Δ ms vs baseline |
|---|---|---|---|---|
| 1000 | non-virtual | 11.3 | 20.7 | -0.2 |
| 1000 | virtual | 1.4 | 20.7 | -0.1 |
| 2000 | non-virtual | 14.8 | 20.7 | -0.2 |
| 2000 | virtual | 1.2 | 20.7 | -0.1 |
| 5000 | non-virtual | 35.6 | 20.7 | -0.4 |
| 5000 | virtual | 1.7 | 20.7 | +0.0 |

## Transition FPS

| slides | fps |
|---|---|
| 50 | 121.8 |
