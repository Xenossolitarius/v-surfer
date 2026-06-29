import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ChipSlider from '../harness/ChipSlider.vue';
import { normalizeVSurferHtml } from '../setup/v-surfer-serializer';

const CHIPS = ['All', 'Slots', 'Live', 'Table', 'Jackpot', 'New'];

describe('ChipSlider — SSR', () => {
  it('server-renders all chips without throwing', async () => {
    const app = createSSRApp(ChipSlider, { chips: CHIPS });
    const html = await renderToString(app);
    expect((html.match(/class="chip"/g) ?? []).length).toBe(CHIPS.length);
  });

  it('matches SSR snapshot', async () => {
    const app = createSSRApp(ChipSlider, { chips: CHIPS });
    const html = await renderToString(app);
    expect(normalizeVSurferHtml(html)).toMatchSnapshot();
  });
});
