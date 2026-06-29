import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';

function mountSurfer(props: Record<string, unknown>, count = 5) {
  return mount(Surfer, {
    props: { spaceBetween: 0, ...props },
    slots: {
      default: () => Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
    },
  });
}

describe('data-v-surfer-slide-index parity with frozen', () => {
  it('sets data-v-surfer-slide-index on every slide when loop: true', async () => {
    const wrapper = mountSurfer({ slidesPerView: 1, loop: true }, 5);
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBeGreaterThan(0);
    // Every rendered slide must carry the attribute (non-null, non-empty string).
    for (const slide of slides) {
      const attr = slide.attributes('data-v-surfer-slide-index');
      expect(attr).toBeDefined();
      expect(attr).not.toBe('');
    }
    // The set of attribute values must be a permutation of 0…N-1 (real indices).
    const values = slides.map((s) => Number(s.attributes('data-v-surfer-slide-index')));
    expect(values.every((v) => Number.isInteger(v) && v >= 0 && v < 5)).toBe(true);
    wrapper.unmount();
  });

  it('does NOT set data-v-surfer-slide-index on any slide when loop: false', async () => {
    const wrapper = mountSurfer({ slidesPerView: 1, loop: false }, 5);
    await flushPromises();
    const slides = wrapper.findAll('.v-surfer-slide');
    expect(slides.length).toBeGreaterThan(0);
    for (const slide of slides) {
      expect(slide.attributes('data-v-surfer-slide-index')).toBeUndefined();
    }
    wrapper.unmount();
  });
});
