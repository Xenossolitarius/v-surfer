import { describe, it, expect } from 'vitest';
import { makeGames } from './fixtures';

describe('makeGames', () => {
  it('produces n games with stable codes and images', () => {
    const games = makeGames(3);
    expect(games).toHaveLength(3);
    expect(games[0]).toEqual({ gameCode: 'game-1', name: 'Game 1', image: '/img/game-1.jpg' });
    expect(games[2].gameCode).toBe('game-3');
  });
});
