import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import Surfer from '../../src/vue/surfer';
import Item from '../../src/vue/item';
import SurferPagination, { PaginationModule } from '../../src/vue/modules/pagination';
import type { ModuleHost } from '../../src/vue/module-host';

function mountPagination(props: Record<string, unknown> = {}, count = 5) {
  let host: ModuleHost | null = null;
  const wrapper = mount(Surfer, {
    props: {
      slidesPerView: 1,
      spaceBetween: 0,
      modules: [PaginationModule],
      onReady: (h2: ModuleHost) => (host = h2),
    },
    slots: {
      default: () => [
        ...Array.from({ length: count }, (_, i) => h(Item, { data: i, key: i })),
        h(SurferPagination, props),
      ],
    },
  });
  return { wrapper, getHost: () => host! };
}

describe('pagination module + <SurferPagination>', () => {
  it('renders one clickable bullet per slide and reflects the active index', async () => {
    const { wrapper, getHost } = mountPagination();
    await flushPromises();
    const bullets = wrapper.findAll('.v-surfer-pagination-bullet');
    expect(bullets.length).toBe(5);
    expect(bullets[0].classes()).toContain('v-surfer-pagination-bullet-active');
    getHost().goTo(2, { speed: 0 });
    await flushPromises();
    expect(wrapper.findAll('.v-surfer-pagination-bullet')[2].classes()).toContain(
      'v-surfer-pagination-bullet-active',
    );
  });

  it('clicking a bullet drives the host', async () => {
    const { wrapper, getHost } = mountPagination();
    await flushPromises();
    await wrapper.findAll('.v-surfer-pagination-bullet')[3].trigger('click');
    await flushPromises();
    expect(getHost().state.value.activeIndex).toBe(3);
  });

  it('fraction type renders current/total', async () => {
    const { wrapper } = mountPagination({ type: 'fraction' });
    await flushPromises();
    expect(wrapper.find('.v-surfer-pagination-fraction').exists()).toBe(true);
    expect(wrapper.text()).toContain('1');
    expect(wrapper.text()).toContain('5');
  });

  it('progressbar type renders a fill whose transform scaleX tracks progress', async () => {
    const { wrapper, getHost } = mountPagination({ type: 'progressbar' });
    await flushPromises();
    const fill = wrapper.find('.v-surfer-pagination-progressbar-fill');
    expect(fill.exists()).toBe(true);
    // At index 0 with 5 slides: progress = (0 + 1) / 5 = 0.2
    expect(fill.attributes('style') ?? '').toContain('scaleX(0.2)');
    // Navigate to index 2: progress = (2 + 1) / 5 = 0.6
    getHost().goTo(2, { speed: 0 });
    await flushPromises();
    expect(
      wrapper.find('.v-surfer-pagination-progressbar-fill').attributes('style') ?? '',
    ).toContain('scaleX(0.6)');
  });
});
