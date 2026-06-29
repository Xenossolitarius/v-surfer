import { describe, it, expect } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import GameRow from '../harness/GameRow.vue';
import { makeGames } from '../harness/fixtures';
import { normalizeVSurferHtml } from '../setup/v-surfer-serializer';

describe('GameRow (gameimg) — SSR', () => {
  it('server-renders all slides and images without throwing', async () => {
    const app = createSSRApp(GameRow, { games: makeGames(8), title: 'Top games' });
    const html = await renderToString(app);
    expect(html).toContain('v-surfer-wrapper');
    expect((html.match(/v-surfer-slide/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((html.match(/game-tile/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(html).toContain('Top games');
  });

  it('matches SSR snapshot', async () => {
    const app = createSSRApp(GameRow, { games: makeGames(5) });
    const html = await renderToString(app);
    expect(normalizeVSurferHtml(html)).toMatchSnapshot();
  });
});
