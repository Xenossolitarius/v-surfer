import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import JackpotStrip from '../harness/JackpotStrip.vue';
import { makeGames } from '../harness/fixtures';
import { normalizeVSurferHtml } from '../setup/v-surfer-serializer';

describe('JackpotStrip — SSR', () => {
  it('server-renders all slides without throwing', async () => {
    const app = createSSRApp(JackpotStrip, { games: makeGames(6) });
    const html = await renderToString(app);
    expect((html.match(/v-surfer-slide/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect((html.match(/jackpot-tile/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it('matches SSR snapshot', async () => {
    const app = createSSRApp(JackpotStrip, { games: makeGames(5) });
    const html = await renderToString(app);
    expect(normalizeVSurferHtml(html)).toMatchSnapshot();
  });
});
