// Public entry for the DOM-free-engine Vue kit (built to dist/vue.mjs).
export { default as Surfer } from './surfer';
export { default as Item } from './item';
export { default as Navigation, NavigationModule } from './modules/navigation';
export { default as Pagination, PaginationModule } from './modules/pagination';
export { default as Scrollbar, ScrollbarModule } from './modules/scrollbar';
export { default as Keyboard, KeyboardModule } from './modules/keyboard';
export { default as Mousewheel, MousewheelModule } from './modules/mousewheel';
export { default as Controller, ControllerModule } from './modules/controller';
export { default as Autoplay, AutoplayModule } from './modules/autoplay';
export { default as A11y, A11yModule } from './modules/a11y';
export { default as EffectFade, EffectFadeModule } from './effects/fade';
export { default as EffectFlip, EffectFlipModule } from './effects/flip';
export { default as EffectCoverflow, EffectCoverflowModule } from './effects/coverflow';
export { default as EffectCreative, EffectCreativeModule } from './effects/creative';
export { default as EffectCube, EffectCubeModule } from './effects/cube';
export { default as EffectCards, EffectCardsModule } from './effects/cards';
export {
  useSurferHost,
  injectHost,
  useSurfer,
  defineSurferModule,
  HOST_KEY,
  type CoreHost,
  type ModuleHost,
  type TypedModuleHost,
  type ModuleDef,
  type ScopedEmit,
  type HostEvents,
  type ReactiveEngineParams,
} from './module-host';
export { CORE_EVENT_NAMES, type CoreEvents } from './core-events';
export { useSurferSlide } from './slide-context';
export type { ItemFlags } from './get-items';
