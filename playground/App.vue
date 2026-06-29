<script setup lang="ts">
// Vue-Kit playground: two kit columns driven by the same controls — the
// props-driven flavor (the kit owns its host, GROUPED component props) and the
// external-:host flavor (useSurferHost, FLAT props). Every engine param +
// per-module + per-effect option is exposed, and a live event feed listens to
// both columns' engine buses.
import { reactive, ref, computed } from 'vue';
import Surfer from '../src/vue/surfer';
import KitItem from '../src/vue/item';
import KitNavigation, { NavigationModule } from '../src/vue/modules/navigation';
import KitPagination, { PaginationModule } from '../src/vue/modules/pagination';
import KitScrollbar, { ScrollbarModule } from '../src/vue/modules/scrollbar';
import KitKeyboard, { KeyboardModule } from '../src/vue/modules/keyboard';
import KitMousewheel, { MousewheelModule } from '../src/vue/modules/mousewheel';
import KitController, { ControllerModule } from '../src/vue/modules/controller';
import KitAutoplay, { AutoplayModule } from '../src/vue/modules/autoplay';
import KitA11y, { A11yModule } from '../src/vue/modules/a11y';
import { useSurferHost, type ModuleHost } from '../src/vue/module-host';
import KitEffectFade, { EffectFadeModule } from '../src/vue/effects/fade';
import KitEffectFlip, { EffectFlipModule } from '../src/vue/effects/flip';
import KitEffectCoverflow, { EffectCoverflowModule } from '../src/vue/effects/coverflow';
import KitEffectCreative, { EffectCreativeModule } from '../src/vue/effects/creative';
import KitEffectCube, { EffectCubeModule } from '../src/vue/effects/cube';
import KitEffectCards, { EffectCardsModule } from '../src/vue/effects/cards';
import { CORE_EVENT_NAMES } from '../src/vue';
import './playground.css';

interface SlideItem {
  n: number;
  color: string;
}

const COUNT = 8;
const mkItem = (n: number): SlideItem => ({ n, color: `hsl(${Math.round((n * 360) / COUNT)}, 70%, 82%)` });
const items: SlideItem[] = Array.from({ length: COUNT }, (_, i) => mkItem(i));
/** A distinct content width per slide, used when slidesPerView is 'auto'. */
const autoWidth = (n: number): number => 120 + (n % 4) * 60;

const allModules = [
  NavigationModule, PaginationModule, ScrollbarModule, KeyboardModule, MousewheelModule,
  ControllerModule, AutoplayModule, A11yModule, EffectFadeModule, EffectFlipModule,
  EffectCoverflowModule, EffectCreativeModule, EffectCubeModule, EffectCardsModule,
];

// ── The full control surface, one reactive object so every input is `v-model="p.x"`.
const p = reactive({
  // Layout
  slidesPerView: 1,
  auto: false,
  spaceBetween: 10,
  vertical: false,
  initialSlide: 0,
  speed: 300,
  slidesPerGroup: 1,
  slidesPerGroupSkip: 0,
  slidesPerGroupAuto: false,
  centeredSlides: false,
  centerInsufficientSlides: false,
  centeredSlidesBounds: false,
  autoHeight: false,
  roundLengths: false,
  // Behavior
  loop: false,
  loopAdditionalSlides: 0,
  loopPreventsSliding: true,
  rewind: false,
  rtl: false,
  cssMode: false,
  oneWayMovement: false,
  normalizeSlideIndex: true,
  // Touch & resistance
  allowTouchMove: true,
  simulateTouch: true,
  allowSlideNext: true,
  allowSlidePrev: true,
  touchRatio: 1,
  touchAngle: 45,
  threshold: 5,
  touchReleaseOnEdges: false,
  resistance: true,
  resistanceRatio: 0.85,
  followFinger: true,
  shortSwipes: true,
  longSwipes: true,
  longSwipesMs: 300,
  longSwipesRatio: 0.5,
  // Free mode
  freeMode: false,
  freeModeSticky: false,
  freeModeMomentum: true,
  freeModeMomentumRatio: 1,
  freeModeMomentumVelocityRatio: 1,
  freeModeMomentumBounce: true,
  freeModeMomentumBounceRatio: 1,
  freeModeMinimumVelocity: 0.02,
  // Virtual
  virtual: false,
  addSlidesBefore: 0,
  addSlidesAfter: 0,
  virtualAutoSlidesPerView: 0,
  // Effect
  effect: 'slide',
  // Modules (toggle + their options)
  navigation: true,
  navHideOnClick: false,
  pagination: true,
  pgType: 'bullets' as 'bullets' | 'fraction' | 'progressbar',
  pgClickable: true,
  scrollbar: true,
  sbDraggable: true,
  sbSnap: false,
  keyboard: false,
  kbViewport: false,
  kbPageUpDown: true,
  mousewheel: false,
  mwForceAxis: false,
  mwInvert: false,
  mwSensitivity: 1,
  mwRelease: false,
  mwSticky: false,
  autoplay: false,
  apDelay: 2000,
  apReverse: false,
  apStopLast: false,
  apDisableOnInteraction: false,
  apPauseHover: true,
  a11y: false,
  controller: false,
  ctrlBy: 'slide' as 'slide' | 'container',
  ctrlInverse: false,
  ctrlTwoWay: true,
});

const dir = (): 'vertical' | 'horizontal' => (p.vertical ? 'vertical' : 'horizontal');

// Grouped object props for the props-driven column (showcases the grouped API).
const centeredGroup = computed(() => ({
  enabled: p.centeredSlides,
  bounds: p.centeredSlidesBounds,
  insufficientSlides: p.centerInsufficientSlides,
}));
const groupGroup = computed(() => ({
  perGroup: p.slidesPerGroup,
  skip: p.slidesPerGroupSkip,
  auto: p.slidesPerGroupAuto,
}));
const freeModeGroup = computed(() =>
  p.freeMode
    ? {
        enabled: true,
        sticky: p.freeModeSticky,
        momentum: p.freeModeMomentum,
        momentumRatio: p.freeModeMomentumRatio,
        momentumVelocityRatio: p.freeModeMomentumVelocityRatio,
        momentumBounce: p.freeModeMomentumBounce,
        momentumBounceRatio: p.freeModeMomentumBounceRatio,
        minimumVelocity: p.freeModeMinimumVelocity,
      }
    : false,
);
const virtualGroup = computed(() =>
  p.virtual
    ? {
        enabled: true,
        addSlidesBefore: p.addSlidesBefore,
        addSlidesAfter: p.addSlidesAfter,
        autoSlidesPerView: p.virtualAutoSlidesPerView,
      }
    : false,
);
const touchGroup = computed(() => ({
  allow: p.allowTouchMove,
  simulate: p.simulateTouch,
  ratio: p.touchRatio,
  angle: p.touchAngle,
  releaseOnEdges: p.touchReleaseOnEdges,
  threshold: p.threshold,
  followFinger: p.followFinger,
}));

// ── Manipulation: the slides come from a reactive list; mutating it flows into the engine.
const slides = ref<SlideItem[]>([...items]);
const opIndex = ref(2);
let nextN = COUNT;
const fresh = (): SlideItem => mkItem(nextN++);
const doAppend = (): void => { slides.value = [...slides.value, fresh()]; };
const doPrepend = (): void => { slides.value = [fresh(), ...slides.value]; };
const doAddAt = (): void => {
  const arr = slides.value.slice();
  arr.splice(Math.max(0, Math.min(opIndex.value, arr.length)), 0, fresh());
  slides.value = arr;
};
const doRemoveAt = (): void => {
  const arr = slides.value.slice();
  if (opIndex.value >= 0 && opIndex.value < arr.length) arr.splice(opIndex.value, 1);
  slides.value = arr;
};
const doRemoveAll = (): void => { slides.value = []; };
const doReset = (): void => { nextN = COUNT; slides.value = [...items]; };

// ── External host (column B): every flat param passed as a getter so the engine stays in sync.
const host = useSurferHost({
  slidesPerView: () => (p.auto ? 'auto' : p.slidesPerView),
  spaceBetween: () => p.spaceBetween,
  direction: dir,
  rtl: () => p.rtl,
  initialSlide: () => p.initialSlide,
  speed: () => p.speed,
  loop: () => p.loop,
  loopAdditionalSlides: () => p.loopAdditionalSlides,
  loopPreventsSliding: () => p.loopPreventsSliding,
  rewind: () => p.rewind,
  slidesPerGroup: () => p.slidesPerGroup,
  slidesPerGroupSkip: () => p.slidesPerGroupSkip,
  slidesPerGroupAuto: () => p.slidesPerGroupAuto,
  centeredSlides: () => p.centeredSlides,
  centerInsufficientSlides: () => p.centerInsufficientSlides,
  centeredSlidesBounds: () => p.centeredSlidesBounds,
  autoHeight: () => p.autoHeight,
  roundLengths: () => p.roundLengths,
  cssMode: () => p.cssMode,
  oneWayMovement: () => p.oneWayMovement,
  normalizeSlideIndex: () => p.normalizeSlideIndex,
  allowTouchMove: () => p.allowTouchMove,
  simulateTouch: () => p.simulateTouch,
  allowSlideNext: () => p.allowSlideNext,
  allowSlidePrev: () => p.allowSlidePrev,
  touchRatio: () => p.touchRatio,
  touchAngle: () => p.touchAngle,
  threshold: () => p.threshold,
  touchReleaseOnEdges: () => p.touchReleaseOnEdges,
  resistance: () => p.resistance,
  resistanceRatio: () => p.resistanceRatio,
  followFinger: () => p.followFinger,
  shortSwipes: () => p.shortSwipes,
  longSwipes: () => p.longSwipes,
  longSwipesMs: () => p.longSwipesMs,
  longSwipesRatio: () => p.longSwipesRatio,
  freeMode: () => p.freeMode,
  freeModeSticky: () => p.freeModeSticky,
  freeModeMomentum: () => p.freeModeMomentum,
  freeModeMomentumRatio: () => p.freeModeMomentumRatio,
  freeModeMomentumVelocityRatio: () => p.freeModeMomentumVelocityRatio,
  freeModeMomentumBounce: () => p.freeModeMomentumBounce,
  freeModeMomentumBounceRatio: () => p.freeModeMomentumBounceRatio,
  freeModeMinimumVelocity: () => p.freeModeMinimumVelocity,
  virtual: () => p.virtual,
  addSlidesBefore: () => p.addSlidesBefore,
  addSlidesAfter: () => p.addSlidesAfter,
  virtualAutoSlidesPerView: () => p.virtualAutoSlidesPerView,
  modules: allModules,
});

// A third host so the controller link has a partner (shown only when controller is on).
const partnerHost = useSurferHost({
  slidesPerView: () => (p.auto ? 'auto' : p.slidesPerView),
  spaceBetween: () => p.spaceBetween,
  direction: dir,
  rtl: () => p.rtl,
  loop: () => p.loop,
  modules: [ControllerModule],
});

// ── Per-column live state readout.
const hostState = reactive({ activeIndex: 0, realIndex: 0, isBeginning: true, isEnd: false, progress: 0 });
host.engine.subscribe((st) => {
  hostState.activeIndex = st.activeIndex;
  hostState.realIndex = st.realIndex;
  hostState.isBeginning = st.isBeginning;
  hostState.isEnd = st.isEnd;
  hostState.progress = st.progress;
});
const propsRealIndex = ref(0);

// Autoplay timer readout (fed by whichever column has autoplay on).
const apProgress = ref(0);
const apTimeLeft = ref(0);
const onApTimeLeft = (e: { timeLeft: number; percentage: number }): void => {
  apTimeLeft.value = e.timeLeft;
  apProgress.value = e.percentage;
};

// ── Event feed: subscribe to every core event on BOTH columns' buses.
interface EventRow { seq: number; src: string; name: string; payload: string }
const NOISY = new Set(['setTranslate', 'setTransition', 'progress', 'sliderMove', 'touchMove', 'touchMoveOpposite']);
const showNoisy = ref(false);
const paused = ref(false);
const feed = ref<EventRow[]>([]);
const counts = reactive<Record<string, number>>({});
let seq = 0;

const fmt = (payload: unknown): string => {
  if (payload === undefined) return '';
  if (typeof payload === 'number') return Number.isInteger(payload) ? String(payload) : payload.toFixed(2);
  if (typeof payload === 'object' && payload !== null && 'type' in payload) {
    return String((payload as { type: string }).type);
  }
  return String(payload);
};

function wireEvents(bus: Pick<ModuleHost, 'on'>, src: string): void {
  for (const name of CORE_EVENT_NAMES) {
    bus.on(name, (payload?: unknown) => {
      counts[name] = (counts[name] ?? 0) + 1;
      if (paused.value) return;
      if (!showNoisy.value && NOISY.has(name)) return;
      feed.value = [{ seq: ++seq, src, name, payload: fmt(payload) }, ...feed.value].slice(0, 80);
    });
  }
}
wireEvents(host, 'B');

// Props-driven column owns its host internally; capture it on ready to wire events + state.
let propsHostWired = false;
const onPropsReady = (h: ModuleHost): void => {
  if (propsHostWired) return;
  propsHostWired = true;
  wireEvents(h, 'A');
  h.engine.subscribe((st) => { propsRealIndex.value = st.realIndex; });
};

const clearFeed = (): void => { feed.value = []; };
const sortedCounts = computed(() => Object.entries(counts).sort((a, b) => b[1] - a[1]));
</script>

<template>
  <div class="page">
    <header class="head">
      <h2 class="title">Vue-Kit Playground</h2>
      <p class="subtitle">
        Two kit columns — <strong>A</strong> props-driven (grouped props, kit owns its host) and
        <strong>B</strong> external <code>:host</code> (flat props) — driven by the same controls, with a
        live engine-event feed listening to both.
      </p>
      <div class="readout">
        <span>A real <b>{{ propsRealIndex }}</b></span>
        <span>B active <b>{{ hostState.activeIndex }}</b></span>
        <span>B real <b>{{ hostState.realIndex }}</b></span>
        <span>B progress <b>{{ hostState.progress.toFixed(2) }}</b></span>
        <span :class="{ on: hostState.isBeginning }">begin</span>
        <span :class="{ on: hostState.isEnd }">end</span>
        <span>slides <b>{{ slides.length }}</b></span>
      </div>
    </header>

    <div class="layout">
      <!-- ── Controls, grouped into collapsible cards ── -->
      <aside class="controls">
        <details class="card" open>
          <summary>Layout</summary>
          <div class="fields">
            <label class="num">slidesPerView <input type="number" min="1" max="6" v-model.number="p.slidesPerView" :disabled="p.auto" /></label>
            <label><input type="checkbox" v-model="p.auto" /> slidesPerView: auto</label>
            <label class="num">spaceBetween <input type="number" min="0" max="80" v-model.number="p.spaceBetween" /></label>
            <label><input type="checkbox" v-model="p.vertical" /> vertical</label>
            <label class="num">initialSlide <input type="number" min="0" max="20" v-model.number="p.initialSlide" /></label>
            <label class="num">speed <input type="number" min="0" max="2000" step="50" v-model.number="p.speed" /></label>
            <label class="num">slidesPerGroup <input type="number" min="1" max="4" v-model.number="p.slidesPerGroup" /></label>
            <label class="num">slidesPerGroupSkip <input type="number" min="0" max="4" v-model.number="p.slidesPerGroupSkip" /></label>
            <label><input type="checkbox" v-model="p.slidesPerGroupAuto" /> slidesPerGroupAuto</label>
            <label><input type="checkbox" v-model="p.centeredSlides" /> centeredSlides</label>
            <label><input type="checkbox" v-model="p.centerInsufficientSlides" /> centerInsufficientSlides</label>
            <label><input type="checkbox" v-model="p.centeredSlidesBounds" /> centeredSlidesBounds</label>
            <label><input type="checkbox" v-model="p.autoHeight" /> autoHeight</label>
            <label><input type="checkbox" v-model="p.roundLengths" /> roundLengths</label>
          </div>
        </details>

        <details class="card" open>
          <summary>Behavior</summary>
          <div class="fields">
            <label><input type="checkbox" v-model="p.loop" /> loop</label>
            <label class="num">loopAdditionalSlides <input type="number" min="0" max="6" v-model.number="p.loopAdditionalSlides" /></label>
            <label><input type="checkbox" v-model="p.loopPreventsSliding" /> loopPreventsSliding</label>
            <label><input type="checkbox" v-model="p.rewind" /> rewind</label>
            <label><input type="checkbox" v-model="p.rtl" /> rtl</label>
            <label><input type="checkbox" v-model="p.cssMode" /> cssMode</label>
            <label><input type="checkbox" v-model="p.oneWayMovement" /> oneWayMovement</label>
            <label><input type="checkbox" v-model="p.normalizeSlideIndex" /> normalizeSlideIndex</label>
          </div>
        </details>

        <details class="card">
          <summary>Touch &amp; resistance</summary>
          <div class="fields">
            <label><input type="checkbox" v-model="p.allowTouchMove" /> allowTouchMove</label>
            <label><input type="checkbox" v-model="p.simulateTouch" /> simulateTouch</label>
            <label><input type="checkbox" v-model="p.allowSlideNext" /> allowSlideNext</label>
            <label><input type="checkbox" v-model="p.allowSlidePrev" /> allowSlidePrev</label>
            <label class="num">touchRatio <input type="number" min="0" max="5" step="0.5" v-model.number="p.touchRatio" /></label>
            <label class="num">touchAngle <input type="number" min="0" max="90" v-model.number="p.touchAngle" /></label>
            <label class="num">threshold <input type="number" min="0" max="50" v-model.number="p.threshold" /></label>
            <label><input type="checkbox" v-model="p.touchReleaseOnEdges" /> touchReleaseOnEdges</label>
            <label><input type="checkbox" v-model="p.resistance" /> resistance</label>
            <label class="num">resistanceRatio <input type="number" min="0" max="1" step="0.05" v-model.number="p.resistanceRatio" /></label>
            <label><input type="checkbox" v-model="p.followFinger" /> followFinger</label>
            <label><input type="checkbox" v-model="p.shortSwipes" /> shortSwipes</label>
            <label><input type="checkbox" v-model="p.longSwipes" /> longSwipes</label>
            <label class="num">longSwipesMs <input type="number" min="0" max="1000" step="50" v-model.number="p.longSwipesMs" /></label>
            <label class="num">longSwipesRatio <input type="number" min="0" max="1" step="0.05" v-model.number="p.longSwipesRatio" /></label>
          </div>
        </details>

        <details class="card">
          <summary>Free mode</summary>
          <div class="fields">
            <label><input type="checkbox" v-model="p.freeMode" /> freeMode</label>
            <label><input type="checkbox" v-model="p.freeModeSticky" /> sticky</label>
            <label><input type="checkbox" v-model="p.freeModeMomentum" /> momentum</label>
            <label class="num">momentumRatio <input type="number" min="0" max="5" step="0.5" v-model.number="p.freeModeMomentumRatio" /></label>
            <label class="num">momentumVelocityRatio <input type="number" min="0" max="5" step="0.5" v-model.number="p.freeModeMomentumVelocityRatio" /></label>
            <label><input type="checkbox" v-model="p.freeModeMomentumBounce" /> momentumBounce</label>
            <label class="num">momentumBounceRatio <input type="number" min="0" max="5" step="0.5" v-model.number="p.freeModeMomentumBounceRatio" /></label>
            <label class="num">minimumVelocity <input type="number" min="0" max="1" step="0.01" v-model.number="p.freeModeMinimumVelocity" /></label>
          </div>
        </details>

        <details class="card">
          <summary>Virtual</summary>
          <div class="fields">
            <label><input type="checkbox" v-model="p.virtual" /> virtual</label>
            <label class="num">addSlidesBefore <input type="number" min="0" max="6" v-model.number="p.addSlidesBefore" /></label>
            <label class="num">addSlidesAfter <input type="number" min="0" max="6" v-model.number="p.addSlidesAfter" /></label>
            <label class="num">virtualAutoSlidesPerView <input type="number" min="0" max="6" v-model.number="p.virtualAutoSlidesPerView" /></label>
          </div>
        </details>

        <details class="card" open>
          <summary>Effect</summary>
          <div class="fields">
            <label class="num">effect
              <select v-model="p.effect">
                <option value="slide">slide</option>
                <option value="fade">fade</option>
                <option value="flip">flip</option>
                <option value="coverflow">coverflow</option>
                <option value="creative">creative</option>
                <option value="cube">cube</option>
                <option value="cards">cards</option>
              </select>
            </label>
          </div>
        </details>

        <details class="card" open>
          <summary>Modules</summary>
          <div class="fields modules">
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.navigation" /> navigation</label>
              <label v-if="p.navigation"><input type="checkbox" v-model="p.navHideOnClick" /> hideOnClick</label>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.pagination" /> pagination</label>
              <template v-if="p.pagination">
                <label class="num">type
                  <select v-model="p.pgType">
                    <option value="bullets">bullets</option>
                    <option value="fraction">fraction</option>
                    <option value="progressbar">progressbar</option>
                  </select>
                </label>
                <label><input type="checkbox" v-model="p.pgClickable" /> clickable</label>
              </template>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.scrollbar" /> scrollbar</label>
              <template v-if="p.scrollbar">
                <label><input type="checkbox" v-model="p.sbDraggable" /> draggable</label>
                <label><input type="checkbox" v-model="p.sbSnap" /> snapOnRelease</label>
              </template>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.keyboard" /> keyboard</label>
              <template v-if="p.keyboard">
                <label><input type="checkbox" v-model="p.kbViewport" /> onlyInViewport</label>
                <label><input type="checkbox" v-model="p.kbPageUpDown" /> pageUpDown</label>
              </template>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.mousewheel" /> mousewheel</label>
              <template v-if="p.mousewheel">
                <label><input type="checkbox" v-model="p.mwForceAxis" /> forceToAxis</label>
                <label><input type="checkbox" v-model="p.mwInvert" /> invert</label>
                <label class="num">sensitivity <input type="number" min="0" max="5" step="0.5" v-model.number="p.mwSensitivity" /></label>
                <label><input type="checkbox" v-model="p.mwRelease" /> releaseOnEdges</label>
                <label><input type="checkbox" v-model="p.mwSticky" /> sticky</label>
              </template>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.autoplay" /> autoplay</label>
              <template v-if="p.autoplay">
                <label class="num">delay <input type="number" min="500" max="6000" step="250" v-model.number="p.apDelay" /></label>
                <label><input type="checkbox" v-model="p.apReverse" /> reverseDirection</label>
                <label><input type="checkbox" v-model="p.apStopLast" /> stopOnLastSlide</label>
                <label><input type="checkbox" v-model="p.apDisableOnInteraction" /> disableOnInteraction</label>
                <label><input type="checkbox" v-model="p.apPauseHover" /> pauseOnMouseEnter</label>
              </template>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.a11y" /> a11y</label>
            </div>
            <div class="mod">
              <label class="mod-head"><input type="checkbox" v-model="p.controller" /> controller</label>
              <template v-if="p.controller">
                <label class="num">by
                  <select v-model="p.ctrlBy">
                    <option value="slide">slide</option>
                    <option value="container">container</option>
                  </select>
                </label>
                <label><input type="checkbox" v-model="p.ctrlInverse" /> inverse</label>
                <label><input type="checkbox" v-model="p.ctrlTwoWay" /> twoWay</label>
              </template>
            </div>
          </div>
        </details>

        <details class="card">
          <summary>Manipulate slides</summary>
          <div class="fields manip">
            <button @click="doAppend">append</button>
            <button @click="doPrepend">prepend</button>
            <label class="num">@ <input type="number" min="0" max="99" v-model.number="opIndex" /></label>
            <button @click="doAddAt">addSlide@</button>
            <button @click="doRemoveAt">removeSlide@</button>
            <button @click="doRemoveAll">removeAll</button>
            <button @click="doReset">reset</button>
          </div>
        </details>
      </aside>

      <!-- ── The two sliders ── -->
      <main class="stage">
        <!-- Column A — props-driven (grouped props, kit owns its host). -->
        <section class="col">
          <h3 class="col-title">A · props-driven <span class="muted">grouped props</span></h3>
          <Surfer
            :slides-per-view="p.auto ? 'auto' : p.slidesPerView"
            :space-between="p.spaceBetween"
            :direction="dir()"
            :rtl="p.rtl"
            :loop="p.loop"
            :rewind="p.rewind"
            :speed="p.speed"
            :initial-slide="p.initialSlide"
            :auto-height="p.autoHeight"
            :css-mode="p.cssMode"
            :one-way-movement="p.oneWayMovement"
            :resistance="p.resistance"
            :resistance-ratio="p.resistanceRatio"
            :centered="centeredGroup"
            :group="groupGroup"
            :free-mode="freeModeGroup"
            :virtual="virtualGroup"
            :touch="touchGroup"
            :modules="allModules"
            :on-ready="onPropsReady"
            class="slider"
            :style="{ height: p.vertical ? '320px' : undefined }"
          >
            <KitItem v-for="it in slides" :key="it.n" :data="it">
              <div class="slide-box" :style="{ background: it.color, width: p.auto ? `${autoWidth(it.n)}px` : undefined }">
                Slide {{ it.n + 1 }}
              </div>
            </KitItem>
            <KitNavigation v-if="p.navigation" :hide-on-click="p.navHideOnClick" />
            <KitPagination v-if="p.pagination" :type="p.pgType" :clickable="p.pgClickable" />
            <KitScrollbar v-if="p.scrollbar" :draggable="p.sbDraggable" :snap-on-release="p.sbSnap" />
            <KitKeyboard v-if="p.keyboard" :only-in-viewport="p.kbViewport" :page-up-down="p.kbPageUpDown" />
            <KitMousewheel v-if="p.mousewheel" :force-to-axis="p.mwForceAxis" :invert="p.mwInvert" :sensitivity="p.mwSensitivity" :release-on-edges="p.mwRelease" :sticky="p.mwSticky" />
            <KitAutoplay
              v-if="p.autoplay"
              :key="`a-ap-${p.loop ? 'l' : 'n'}-${p.rewind ? 'r' : 'n'}`"
              :delay="p.apDelay"
              :reverse-direction="p.apReverse"
              :stop-on-last-slide="p.apStopLast"
              :disable-on-interaction="p.apDisableOnInteraction"
              :pause-on-mouse-enter="p.apPauseHover"
              @autoplay-time-left="onApTimeLeft"
            />
            <KitA11y v-if="p.a11y" :key="`a-a11y-${p.loop ? 'l' : 'n'}-${p.rewind ? 'r' : 'n'}`" />
            <KitEffectFade v-if="p.effect === 'fade'" />
            <KitEffectFlip v-if="p.effect === 'flip'" />
            <KitEffectCoverflow v-if="p.effect === 'coverflow'" />
            <KitEffectCreative v-if="p.effect === 'creative'" />
            <KitEffectCube v-if="p.effect === 'cube'" />
            <KitEffectCards v-if="p.effect === 'cards'" />
          </Surfer>
        </section>

        <!-- Column B — external :host (flat props, useSurferHost owns the engine). -->
        <section class="col">
          <h3 class="col-title">B · external <code>:host</code> <span class="muted">flat props · useSurferHost</span></h3>
          <Surfer
            :host="host"
            :slides-per-view="p.auto ? 'auto' : p.slidesPerView"
            :space-between="p.spaceBetween"
            :centered-slides="p.centeredSlides"
            :direction="dir()"
            :rtl="p.rtl"
            :loop="p.loop"
            :rewind="p.rewind"
            :slides-per-group-auto="p.slidesPerGroupAuto"
            :free-mode="p.freeMode"
            :virtual="p.virtual"
            :virtual-auto-slides-per-view="p.virtualAutoSlidesPerView"
            :css-mode="p.cssMode"
            :auto-height="p.autoHeight"
            class="slider"
            :style="{ height: p.vertical ? '320px' : undefined }"
          >
            <KitItem v-for="it in slides" :key="it.n" :data="it">
              <div class="slide-box" :style="{ background: it.color, width: p.auto ? `${autoWidth(it.n)}px` : undefined }">
                Slide {{ it.n + 1 }}
              </div>
            </KitItem>
            <KitNavigation v-if="p.navigation" :hide-on-click="p.navHideOnClick" />
            <KitPagination v-if="p.pagination" :type="p.pgType" :clickable="p.pgClickable" />
            <KitScrollbar v-if="p.scrollbar" :draggable="p.sbDraggable" :snap-on-release="p.sbSnap" />
            <KitKeyboard v-if="p.keyboard" :only-in-viewport="p.kbViewport" :page-up-down="p.kbPageUpDown" />
            <KitMousewheel v-if="p.mousewheel" :force-to-axis="p.mwForceAxis" :invert="p.mwInvert" :sensitivity="p.mwSensitivity" :release-on-edges="p.mwRelease" :sticky="p.mwSticky" />
            <KitAutoplay
              v-if="p.autoplay"
              :key="`b-ap-${p.loop ? 'l' : 'n'}-${p.rewind ? 'r' : 'n'}`"
              :delay="p.apDelay"
              :reverse-direction="p.apReverse"
              :stop-on-last-slide="p.apStopLast"
              :disable-on-interaction="p.apDisableOnInteraction"
              :pause-on-mouse-enter="p.apPauseHover"
              @autoplay-time-left="onApTimeLeft"
            />
            <KitA11y v-if="p.a11y" :key="`b-a11y-${p.loop ? 'l' : 'n'}-${p.rewind ? 'r' : 'n'}`" />
            <KitController
              v-if="p.controller"
              :key="`ctrl-${p.loop ? 'l' : 'n'}-${p.rtl ? 'r' : 'l'}`"
              :control="partnerHost"
              :by="p.ctrlBy"
              :inverse="p.ctrlInverse"
              :two-way="p.ctrlTwoWay"
            />
            <KitEffectFade v-if="p.effect === 'fade'" />
            <KitEffectFlip v-if="p.effect === 'flip'" />
            <KitEffectCoverflow v-if="p.effect === 'coverflow'" />
            <KitEffectCreative v-if="p.effect === 'creative'" />
            <KitEffectCube v-if="p.effect === 'cube'" />
            <KitEffectCards v-if="p.effect === 'cards'" />
          </Surfer>
          <div class="nav-row">
            <button @click="host.engine.slidePrev()">‹ Prev</button>
            <button @click="host.engine.slideNext()">Next ›</button>
          </div>
        </section>

        <div v-if="p.autoplay" class="ap-timer">
          <div class="ap-fill" :style="{ width: `${Math.max(0, Math.min(1, apProgress)) * 100}%` }"></div>
          <span class="ap-label">{{ (Math.max(0, apTimeLeft) / 1000).toFixed(1) }}s</span>
        </div>

        <!-- Controller partner slider (only when controller is on), linked two-way to column B. -->
        <section v-if="p.controller" class="col">
          <h3 class="col-title">Controller partner <span class="muted">linked {{ p.ctrlTwoWay ? 'two-way' : 'one-way' }} to B</span></h3>
          <Surfer
            :host="partnerHost"
            :slides-per-view="p.auto ? 'auto' : p.slidesPerView"
            :space-between="p.spaceBetween"
            :direction="dir()"
            :rtl="p.rtl"
            :loop="p.loop"
            class="slider"
            :style="{ height: p.vertical ? '320px' : undefined }"
          >
            <KitItem v-for="it in slides" :key="it.n" :data="it">
              <div class="slide-box small" :style="{ background: it.color, width: p.auto ? `${autoWidth(it.n)}px` : undefined }">
                {{ it.n + 1 }}
              </div>
            </KitItem>
          </Surfer>
        </section>
      </main>

      <!-- ── Live event feed (both columns) ── -->
      <aside class="events">
        <div class="events-head">
          <strong>Events</strong>
          <label><input type="checkbox" v-model="showNoisy" /> noisy</label>
          <label><input type="checkbox" v-model="paused" /> pause</label>
          <button @click="clearFeed">clear</button>
        </div>
        <ol class="feed">
          <li v-for="row in feed" :key="row.seq" :class="{ noisy: NOISY.has(row.name) }">
            <span class="seq">{{ row.seq }}</span>
            <span class="src" :class="`src-${row.src}`">{{ row.src }}</span>
            <span class="ev-name">{{ row.name }}</span>
            <span v-if="row.payload" class="ev-payload">{{ row.payload }}</span>
          </li>
          <li v-if="feed.length === 0" class="empty">interact with either slider to see events…</li>
        </ol>
        <details class="counts">
          <summary>Counts ({{ sortedCounts.length }})</summary>
          <ul>
            <li v-for="[name, c] in sortedCounts" :key="name">
              <span class="ev-name">{{ name }}</span><span class="c">{{ c }}</span>
            </li>
          </ul>
        </details>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1500px;
  margin: 24px auto;
  padding: 0 16px;
  font-family: system-ui, sans-serif;
  color: #222;
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 18px;
}
.title { margin: 0; }
.subtitle { margin: 0; color: #666; font-size: 13px; flex: 1 1 280px; }
.readout {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #555;
  width: 100%;
  margin-top: 4px;
  flex-wrap: wrap;
}
.readout b { color: #111; }
.readout .on { color: #fff; background: #2e7d32; padding: 0 6px; border-radius: 4px; }

.layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 280px;
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}
@media (max-width: 1100px) {
  .layout { grid-template-columns: 1fr; }
}

/* Controls */
.controls { display: flex; flex-direction: column; gap: 10px; }
.card {
  border: 1px solid #dcdcdc;
  border-left: 4px solid #4caf50;
  border-radius: 6px;
  background: #fafafa;
}
.card > summary {
  cursor: pointer;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  user-select: none;
}
.card .fields {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 4px 12px 12px;
  font-size: 12.5px;
}
.card .fields.modules { gap: 10px; }
.card label { display: flex; align-items: center; gap: 6px; }
.card label.num { justify-content: space-between; }
.card input[type='number'] { width: 64px; }
.card select { font-size: 12px; }
.mod {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 4px;
  border-left: 2px solid #e0e0e0;
}
.mod .mod-head { font-weight: 600; }
.manip { flex-direction: row; flex-wrap: wrap; align-items: center; }
.manip button { font-size: 12px; }

/* Stage */
.stage { min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.col { min-width: 0; }
.col-title { margin: 0 0 8px; font-size: 14px; }
.col-title .muted { font-weight: 400; color: #999; font-size: 12px; }
.col-title code { font-size: 12px; }
.slider {
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 6px;
}
.slide-box {
  height: 200px;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 20px;
  box-sizing: border-box;
}
.slide-box.small { height: 120px; font-size: 14px; }
.nav-row { margin-top: 10px; display: flex; gap: 8px; }
.ap-timer {
  position: relative;
  height: 16px;
  background: #eee;
  border-radius: 8px;
  overflow: hidden;
}
.ap-fill { height: 100%; background: #4caf50; transition: width 0.1s linear; }
.ap-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: #333;
}

/* Events */
.events {
  border: 1px solid #dcdcdc;
  border-left: 4px solid #2196f3;
  border-radius: 6px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  max-height: 720px;
  position: sticky;
  top: 16px;
}
.events-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid #e2e2e2;
}
.events-head button { margin-left: auto; font-size: 11px; }
.feed {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  flex: 1;
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
}
.feed li {
  display: flex;
  gap: 6px;
  align-items: baseline;
  padding: 2px 4px;
  border-bottom: 1px solid #f0f0f0;
}
.feed li.noisy { color: #999; }
.feed .seq { color: #bbb; min-width: 28px; text-align: right; }
.feed .src { font-weight: 700; min-width: 14px; }
.feed .src-A { color: #6a1b9a; }
.feed .src-B { color: #1565c0; }
.feed .ev-name { color: #333; font-weight: 600; }
.feed .ev-payload { color: #777; }
.feed .empty { color: #999; font-style: italic; }
.counts { border-top: 1px solid #e2e2e2; font-size: 11.5px; }
.counts > summary { padding: 6px 12px; cursor: pointer; }
.counts ul { list-style: none; margin: 0; padding: 4px 12px 12px; max-height: 200px; overflow-y: auto; }
.counts li { display: flex; justify-content: space-between; font-family: ui-monospace, monospace; }
.counts .c { color: #1565c0; font-weight: 600; }
</style>
