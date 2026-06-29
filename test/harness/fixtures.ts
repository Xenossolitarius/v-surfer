export type FakeGame = {
  gameCode: string;
  name: string;
  image: string;
};

export function makeGames(n: number): FakeGame[] {
  return Array.from({ length: n }, (_, i) => ({
    gameCode: `game-${i + 1}`,
    name: `Game ${i + 1}`,
    image: `/img/game-${i + 1}.jpg`,
  }));
}
