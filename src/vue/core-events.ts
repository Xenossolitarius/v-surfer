/**
 * The canonical core-event surface of the kit: every event the DOM-free engine emits
 * (state deltas, transitions, loop/momentum/update) plus the DOM touch/resize events the
 * Vue layer emits. Payloads: void unless noted. This is the SINGLE source of truth —
 * `Surfer.emits` and the host bus typing both derive from it.
 */
export interface CoreEvents {
  activeIndexChange: void;
  slideChange: void;
  realIndexChange: void;
  snapIndexChange: void;
  progress: number;
  reachBeginning: void;
  reachEnd: void;
  toEdge: void;
  fromEdge: void;
  setTranslate: number;
  setTransition: number;
  slidesLengthChange: void;
  snapGridLengthChange: void;
  slidesGridLengthChange: void;
  slidesUpdated: void;
  changeDirection: void;
  beforeTransitionStart: void;
  transitionStart: void;
  transitionEnd: void;
  beforeSlideChangeStart: void;
  slideChangeTransitionStart: void;
  slideChangeTransitionEnd: void;
  slideNextTransitionStart: void;
  slideNextTransitionEnd: void;
  slidePrevTransitionStart: void;
  slidePrevTransitionEnd: void;
  slideResetTransitionStart: void;
  slideResetTransitionEnd: void;
  beforeLoopFix: void;
  loopFix: void;
  momentumBounce: void;
  update: void;
  touchStart: PointerEvent;
  touchMove: PointerEvent;
  touchEnd: PointerEvent;
  sliderMove: PointerEvent;
  sliderFirstMove: PointerEvent;
  touchMoveOpposite: PointerEvent;
  tap: PointerEvent;
  click: PointerEvent;
  doubleTap: PointerEvent;
  doubleClick: PointerEvent;
  beforeResize: void;
  resize: void;
  lock: void;
  unlock: void;
  breakpoint: void;
}

/** Runtime list of all core event names (drives `Surfer.emits` + core-event forwarding). */
export const CORE_EVENT_NAMES: readonly (keyof CoreEvents)[] = [
  'activeIndexChange',
  'slideChange',
  'realIndexChange',
  'snapIndexChange',
  'progress',
  'reachBeginning',
  'reachEnd',
  'toEdge',
  'fromEdge',
  'setTranslate',
  'setTransition',
  'slidesLengthChange',
  'snapGridLengthChange',
  'slidesGridLengthChange',
  'slidesUpdated',
  'changeDirection',
  'beforeTransitionStart',
  'transitionStart',
  'transitionEnd',
  'beforeSlideChangeStart',
  'slideChangeTransitionStart',
  'slideChangeTransitionEnd',
  'slideNextTransitionStart',
  'slideNextTransitionEnd',
  'slidePrevTransitionStart',
  'slidePrevTransitionEnd',
  'slideResetTransitionStart',
  'slideResetTransitionEnd',
  'beforeLoopFix',
  'loopFix',
  'momentumBounce',
  'update',
  'touchStart',
  'touchMove',
  'touchEnd',
  'sliderMove',
  'sliderFirstMove',
  'touchMoveOpposite',
  'tap',
  'click',
  'doubleTap',
  'doubleClick',
  'beforeResize',
  'resize',
  'lock',
  'unlock',
  'breakpoint',
];
