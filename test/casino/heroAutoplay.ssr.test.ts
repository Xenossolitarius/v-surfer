import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import HeroAutoplay from '../harness/HeroAutoplay.vue';
import { makeGames } from '../harness/fixtures';
import { normalizeVSurferHtml } from '../setup/v-surfer-serializer';

describe('HeroAutoplay — SSR', () => {
  it('server-renders slides without throwing', async () => {
    const app = createSSRApp(HeroAutoplay, { games: makeGames(8) });
    const html = await renderToString(app);
    expect((html.match(/hero-tile/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });

  it('matches SSR snapshot', async () => {
    const app = createSSRApp(HeroAutoplay, { games: makeGames(8) });
    const html = await renderToString(app);
    expect(normalizeVSurferHtml(html)).toMatchSnapshot();
  });
});
