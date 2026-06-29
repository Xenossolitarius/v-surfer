// Vue dev warnings that are EXPECTED during the test run and only add noise. Test
// correctness is guarded by assertions, not by these warnings, so silencing them is safe.
//
// - `Slot "default" invoked outside`: <Surfer>'s setup() intentionally invokes the default
//   slot once to seed slides for SSR + first-paint/hydration (see src/vue/surfer.ts). The
//   warning's formatter also inspects the component instance, which is the giant host dump.
// - `Component is missing template or render function` + `injection "Symbol(surferHost)" not
//   found`: emitted by test/vue/use-surfer.test.ts's negative tests, which assert that the
//   composables throw when used outside a <Surfer>/<Item> context.
const SILENCED_PREFIXES = [
  '[Vue warn]: Slot "default" invoked outside',
  '[Vue warn]: Component is missing template or render function',
  '[Vue warn]: injection "Symbol(surferHost)" not found',
];

export function isSilencedWarning(msg: unknown): boolean {
  return typeof msg === 'string' && SILENCED_PREFIXES.some((p) => msg.startsWith(p));
}
