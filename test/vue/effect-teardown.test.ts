/**
 * Regression test: factory effect (coverflow) teardown must clear per-slide styles + shadows.
 *
 * Bug: defineEffectModule's onBeforeUnmount only reset host fields (effectClasses/virtualTranslate/
 * paramOverrides) but did NOT clear per-slide transform/opacity/zIndex/transformOrigin or remove
 * injected v-surfer-slide-shadow children. Switching or toggling a factory effect OFF left stale
 * transforms and shadow divs on the slides, causing visible breakage.
 *
 * This test mounts coverflow (which produces non-identity transforms + shadow children), then
 * unmounts ONLY the effect component (via v-if) while the surfer stays mounted, and asserts
 * all per-slide styles and shadows are cleaned up.
 */
import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h, ref, defineComponent } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import { EffectCoverflowModule } from '../../src/vue/effects/coverflow';
import KitEffectCoverflow from '../../src/vue/effects/coverflow';

describe('factory effect teardown: per-slide styles + shadows cleared on unmount', () => {
  it('coverflow: unmounting effect component clears slide transform/opacity/zIndex and shadow children', async () => {
    // Use a reactive ref to control whether the effect component is in the tree
    const showEffect = ref(true);

    const App = defineComponent({
      setup() {
        return () =>
          h(
            Surfer,
            {
              modules: [EffectCoverflowModule],
              config: { coverflow: { slideShadows: true } },
            },
            {
              default: () => [
                ...Array.from({ length: 3 }, (_, i) => h(Item, { data: i, key: i })),
                // Only render the effect component when showEffect is true
                showEffect.value ? h(KitEffectCoverflow) : null,
              ],
            },
          );
      },
    });

    const wrapper = mount(App, { attachTo: document.body });
    await flushPromises();

    // --- Verify coverflow is active: non-empty transforms + shadow children present ---
    // wrapper.element is the Surfer root (App renders Surfer as its direct root)
    const container = wrapper.element as HTMLElement;
    expect(
      container.classList.contains('v-surfer') || container.querySelector('.v-surfer-slide'),
    ).toBeTruthy();

    const slides = wrapper.element.querySelectorAll<HTMLElement>('.v-surfer-slide');
    expect(slides.length).toBe(3);

    // At least one slide should have a non-empty transform set by coverflow
    const transformsBefore = Array.from(slides).map((el) => el.style.transform);
    expect(transformsBefore.some((t) => t !== '')).toBe(true);

    // At least one slide should have shadow children
    const shadowsBefore = wrapper.element.querySelectorAll('[class*="v-surfer-slide-shadow"]');
    expect(shadowsBefore.length).toBeGreaterThan(0);

    // --- Now unmount ONLY the effect component (set showEffect = false) ---
    showEffect.value = false;
    await flushPromises();

    // --- Assert all per-slide styles are cleared ---
    const slidesAfter = wrapper.element.querySelectorAll<HTMLElement>('.v-surfer-slide');
    for (const el of slidesAfter) {
      expect(el.style.transform).toBe('');
      expect(el.style.opacity).toBe('');
      expect(el.style.zIndex).toBe('');
      expect(el.style.transformOrigin).toBe('');
    }

    // --- Assert all shadow children are removed ---
    const shadowsAfter = wrapper.element.querySelectorAll('[class*="v-surfer-slide-shadow"]');
    expect(shadowsAfter.length).toBe(0);

    wrapper.unmount();
  });
});
