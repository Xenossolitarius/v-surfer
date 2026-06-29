// Browser-side console filter. In browser-mode tests, expected Vue dev warnings (see
// test/setup/known-warnings.ts) are printed by Vue inside the page and then forwarded to
// the terminal, so vitest's node-side `onConsoleLog` never sees them; we drop them here,
// before the bridge picks them up.
import { isSilencedWarning } from './known-warnings';

const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (isSilencedWarning(args[0])) return;
  originalWarn(...args);
};
