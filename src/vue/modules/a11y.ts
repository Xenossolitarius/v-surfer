import { defineComponent, onMounted, onBeforeUnmount, watch, type PropType } from 'vue';
import { defineSurferModule, injectHost } from '../module-host';
import { formatA11yMessage, notificationMessage } from '../../headless/a11y';

export interface A11yConfig {
  enabled?: boolean;
  slideRole?: string | null;
  containerRole?: string | null;
  containerMessage?: string | null;
  containerRoleDescriptionMessage?: string | null;
  itemRoleDescriptionMessage?: string | null;
  slideLabelMessage?: string;
  prevSlideMessage?: string;
  nextSlideMessage?: string;
  firstSlideMessage?: string;
  lastSlideMessage?: string;
  paginationBulletMessage?: string;
  notificationClass?: string;
  wrapperLiveRegion?: boolean;
  id?: string | null;
  scrollOnFocus?: boolean;
  clickable?: boolean;
  autoplay?: boolean;
}

/** Config-only module: contributes typed host.config.a11y; the component applies aria attributes. */
export const A11yModule = defineSurferModule<A11yConfig>()('a11y');

const SurferA11y = defineComponent({
  name: 'SurferA11y',
  props: {
    enabled: { type: Boolean, default: true },
    slideRole: { type: String as PropType<string | null>, default: 'group' },
    containerRole: { type: String as PropType<string | null>, default: null },
    containerMessage: { type: String as PropType<string | null>, default: null },
    containerRoleDescriptionMessage: { type: String as PropType<string | null>, default: null },
    itemRoleDescriptionMessage: { type: String as PropType<string | null>, default: null },
    slideLabelMessage: { type: String, default: '{{index}} / {{slidesLength}}' },
    prevSlideMessage: { type: String, default: 'Previous slide' },
    nextSlideMessage: { type: String, default: 'Next slide' },
    firstSlideMessage: { type: String, default: 'This is the first slide' },
    lastSlideMessage: { type: String, default: 'This is the last slide' },
    paginationBulletMessage: { type: String, default: 'Go to slide {{index}}' },
    notificationClass: { type: String, default: 'v-surfer-notification' },
    wrapperLiveRegion: { type: Boolean, default: true },
    id: { type: String as PropType<string | null>, default: null },
    scrollOnFocus: { type: Boolean, default: true },
    clickable: { type: Boolean, default: true },
    autoplay: { type: Boolean, default: false },
  },
  setup(props) {
    const host = injectHost();
    const cfg = host.config.a11y as A11yConfig | undefined;

    let liveRegion: HTMLElement | null = null;
    let bound = false;
    let focusTargetSlideEl: HTMLElement | undefined;
    let preventFocusHandler = false;
    let clicked = false;
    let visibilityChangedTimestamp = Date.now();
    let boundDoc: Document | undefined;

    const enabled = (): boolean => cfg?.enabled ?? props.enabled ?? true;
    const slideRole = (): string | null => cfg?.slideRole ?? props.slideRole ?? 'group';
    const slideLabelMessage = (): string =>
      cfg?.slideLabelMessage ?? props.slideLabelMessage ?? '{{index}} / {{slidesLength}}';
    const itemRoleDescriptionMessage = (): string | null =>
      cfg?.itemRoleDescriptionMessage ?? props.itemRoleDescriptionMessage ?? null;
    const containerRole = (): string | null => cfg?.containerRole ?? props.containerRole ?? null;
    const containerMessage = (): string | null =>
      cfg?.containerMessage ?? props.containerMessage ?? null;
    const containerRoleDescriptionMessage = (): string | null =>
      cfg?.containerRoleDescriptionMessage ?? props.containerRoleDescriptionMessage ?? null;
    const notificationClass = (): string =>
      cfg?.notificationClass ?? props.notificationClass ?? 'v-surfer-notification';
    const wrapperLiveRegion = (): boolean =>
      cfg?.wrapperLiveRegion ?? props.wrapperLiveRegion ?? true;
    const scrollOnFocus = (): boolean => cfg?.scrollOnFocus ?? props.scrollOnFocus ?? true;
    const prevSlideMessage = (): string =>
      cfg?.prevSlideMessage ?? props.prevSlideMessage ?? 'Previous slide';
    const nextSlideMessage = (): string =>
      cfg?.nextSlideMessage ?? props.nextSlideMessage ?? 'Next slide';
    const firstSlideMessage = (): string =>
      cfg?.firstSlideMessage ?? props.firstSlideMessage ?? 'This is the first slide';
    const lastSlideMessage = (): string =>
      cfg?.lastSlideMessage ?? props.lastSlideMessage ?? 'This is the last slide';
    const paginationBulletMessage = (): string =>
      cfg?.paginationBulletMessage ?? props.paginationBulletMessage ?? 'Go to slide {{index}}';
    // Frozen reads its own `params.autoplay` to set wrapper aria-live to 'off'
    // (a11y.ts:121). Modules are isolated here, so the consumer mirrors autoplay
    // state via this prop — set it to match your autoplay module config.
    const autoplayOn = (): boolean => cfg?.autoplay ?? props.autoplay ?? false;
    // Frozen gates bullet a11y on `pagination.clickable` (a11y.ts:206). Same
    // isolation: this prop is the consumer's channel to mirror that config.
    const clickable = (): boolean => cfg?.clickable ?? props.clickable ?? true;

    const randomId = (size = 16): string =>
      'x'.repeat(size).replace(/x/g, () => Math.round(16 * Math.random()).toString(16));

    const notify = (message: string): void => {
      if (liveRegion) liveRegion.textContent = message;
    };

    // State-driven decoration: re-applied on every state/slideEls change.
    const decorate = (): void => {
      const s = host.state.value;
      const slidesLength = s.slides.length;
      const container = host.containerEl.value;

      if (container) {
        if (containerRoleDescriptionMessage()) {
          container.setAttribute('aria-roledescription', containerRoleDescriptionMessage()!);
        }
        if (containerRole()) {
          container.setAttribute('role', containerRole()!);
        }
        if (containerMessage()) {
          container.setAttribute('aria-label', containerMessage()!);
        }

        const wrapper = container.querySelector<HTMLElement>('.v-surfer-wrapper');
        if (wrapper) {
          const wrapperId =
            (cfg?.id ?? props.id) ||
            wrapper.getAttribute('id') ||
            `v-surfer-wrapper-${randomId(16)}`;
          wrapper.setAttribute('id', wrapperId);
          if (wrapperLiveRegion()) {
            wrapper.setAttribute('aria-live', autoplayOn() ? 'off' : 'polite');
          }
        }
      }

      // Decorate slides using host.slideEls (parallel to rendered slides in layout order).
      const slideEls = host.slideEls.value;
      const renderedSlides = s.slides;
      slideEls.forEach((slideEl, pos) => {
        if (!slideEl) return;
        const cs = renderedSlides[pos];
        if (!cs) return;
        const role = slideRole();
        if (role) slideEl.setAttribute('role', role);
        const ird = itemRoleDescriptionMessage();
        if (ird) slideEl.setAttribute('aria-roledescription', ird);
        const labelTpl = slideLabelMessage();
        if (labelTpl) {
          slideEl.setAttribute(
            'aria-label',
            formatA11yMessage(labelTpl, { index: cs.realIndex + 1, slidesLength }),
          );
        }
      });

      // Navigation role + aria-label — always applied regardless of loop/rewind.
      if (container) {
        const prevBtn = container.querySelector<HTMLElement>('.v-surfer-button-prev');
        const nextBtn = container.querySelector<HTMLElement>('.v-surfer-button-next');
        if (prevBtn) {
          prevBtn.setAttribute('role', 'button');
          prevBtn.setAttribute('aria-label', prevSlideMessage());
        }
        if (nextBtn) {
          nextBtn.setAttribute('role', 'button');
          nextBtn.setAttribute('aria-label', nextSlideMessage());
        }
      }

      // Navigation disabled-toggle when neither loop nor rewind.
      const layout = s.layout;
      if (!layout.loop && !layout.rewind) {
        if (container) {
          const prev = container.querySelector<HTMLElement>('.v-surfer-button-prev');
          const next = container.querySelector<HTMLElement>('.v-surfer-button-next');
          const toggleDisabled = (el: HTMLElement, disabled: boolean): void => {
            if (disabled) {
              el.setAttribute('aria-disabled', 'true');
              el.setAttribute('tabIndex', '-1');
            } else {
              el.removeAttribute('aria-disabled');
              el.setAttribute('tabIndex', '0');
            }
          };
          if (prev) toggleDisabled(prev, s.isBeginning);
          if (next) toggleDisabled(next, s.isEnd);
        }
      }

      if (container && clickable()) {
        const bullets = container.querySelectorAll<HTMLElement>('.v-surfer-pagination-bullet');
        bullets.forEach((bullet, i) => {
          bullet.setAttribute('role', 'button');
          bullet.setAttribute(
            'aria-label',
            formatA11yMessage(paginationBulletMessage(), { index: i + 1, slidesLength }),
          );
          if (bullet.classList.contains('v-surfer-pagination-bullet-active')) {
            bullet.setAttribute('aria-current', 'true');
          } else {
            bullet.removeAttribute('aria-current');
          }
        });
      }
    };

    const isVisibleSlide = (slideEl: HTMLElement): boolean => {
      const s = host.state.value;
      const slideEls = host.slideEls.value;
      const pos = slideEls.indexOf(slideEl);
      if (pos === -1) return false;
      const cs = s.slides[pos];
      return !!cs && (cs.isActive || cs.isVisible);
    };

    const handlePointerDown = (e: Event): void => {
      const target = e.target as Node;
      if (
        focusTargetSlideEl &&
        focusTargetSlideEl !== target &&
        !focusTargetSlideEl.contains(target)
      ) {
        preventFocusHandler = true;
      }
      clicked = true;
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      const code = e.keyCode || e.charCode;
      if (code !== 13 && code !== 32) return; // Enter / Space
      const target = e.target as HTMLElement | null;
      const activatable = target?.closest<HTMLElement>(
        '.v-surfer-button-prev, .v-surfer-button-next, .v-surfer-pagination-bullet',
      );
      if (!activatable) return;
      e.preventDefault();
      activatable.click();
    };

    const handlePointerUp = (): void => {
      preventFocusHandler = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          clicked = false;
        });
      });
    };

    const onVisibilityChange = (): void => {
      visibilityChangedTimestamp = Date.now();
    };

    const handleFocus = (e: FocusEvent): void => {
      if (clicked || !scrollOnFocus()) return;
      if (Date.now() - visibilityChangedTimestamp < 100) return;
      const container = host.containerEl.value;
      const slideEl = (e.target as HTMLElement).closest<HTMLElement>('.v-surfer-slide');
      if (!slideEl || !container?.contains(slideEl)) return;
      focusTargetSlideEl = slideEl;
      if (isVisibleSlide(slideEl)) return;
      const fe = e as FocusEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } };
      if (fe.sourceCapabilities && fe.sourceCapabilities.firesTouchEvents) return;
      if (container) {
        container.scrollLeft = 0;
        container.scrollTop = 0;
      }
      const slideEls = host.slideEls.value;
      const pos = slideEls.indexOf(slideEl);
      if (pos === -1) return;
      const cs = host.state.value.slides[pos];
      if (!cs) return;
      const realIndex = cs.realIndex;
      const layout = host.state.value.layout;
      requestAnimationFrame(() => {
        if (preventFocusHandler) return;
        if (layout.loop) host.engine.slideToLoop(realIndex, { speed: 0 });
        else host.engine.slideTo(realIndex, { speed: 0 });
        preventFocusHandler = false;
      });
    };

    const bind = (): void => {
      const container = host.containerEl.value;
      if (bound || !enabled() || !container) return;
      bound = true;
      liveRegion = document.createElement('span');
      liveRegion.className = notificationClass();
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      container.append(liveRegion);
      decorate();
      container.addEventListener('focus', handleFocus, true);
      container.addEventListener('pointerdown', handlePointerDown, true);
      container.addEventListener('pointerup', handlePointerUp, true);
      container.addEventListener('keydown', handleKeyDown, true);
      boundDoc = container.ownerDocument;
      boundDoc.addEventListener('visibilitychange', onVisibilityChange);
    };

    const teardown = (): void => {
      if (!bound) return;
      bound = false;
      const container = host.containerEl.value;
      container?.removeEventListener('focus', handleFocus, true);
      container?.removeEventListener('pointerdown', handlePointerDown, true);
      container?.removeEventListener('pointerup', handlePointerUp, true);
      container?.removeEventListener('keydown', handleKeyDown, true);
      boundDoc?.removeEventListener('visibilitychange', onVisibilityChange);
      boundDoc = undefined;
      focusTargetSlideEl = undefined;
      liveRegion?.remove();
      liveRegion = null;
    };

    onMounted(bind);
    onBeforeUnmount(teardown);

    // Re-bind when containerEl or enabled changes.
    watch(
      () => [host.containerEl.value, enabled()] as const,
      () => {
        teardown();
        bind();
      },
    );

    // Re-decorate on every engine state change.
    watch(host.state, () => {
      if (bound) decorate();
    });

    // Re-decorate on slide elements change.
    watch(host.slideEls, () => {
      if (bound) decorate();
    });

    // Announce active-slide changes via the live region (lazy: skips the initial render).
    watch(
      () => host.state.value.activeIndex,
      (next, prev) => {
        if (!enabled() || !liveRegion) return;
        const s = host.state.value;
        const direction: 'next' | 'prev' = next >= prev ? 'next' : 'prev';
        notify(
          notificationMessage(
            direction,
            { isBeginning: s.isBeginning, isEnd: s.isEnd },
            {
              prevSlideMessage: prevSlideMessage(),
              nextSlideMessage: nextSlideMessage(),
              firstSlideMessage: firstSlideMessage(),
              lastSlideMessage: lastSlideMessage(),
            },
          ),
        );
      },
    );

    return () => null;
  },
});

export default SurferA11y;
