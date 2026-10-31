export type Mode = 'up' | 'down';

export interface Player {
  id: string;
  name: string;
  color: string;
}

// One input of points for one player.
export interface Entry {
  playerId: string;
  value: number;
}

export interface Game {
  mode: Mode;
  // Score of each player at the start of a game in the 'down' mode.
  start: number;
  players: Player[];
  // All entries of the current game, oldest first.
  entries: Entry[];
}

const STORAGE_KEY = 'points.v1';

// Colors that the user can select for a player.
export const COLORS = [
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#f4511e',
  '#fb8c00',
  '#00897b',
  '#6d4c41',
];

export const DEFAULT_GAME: Game = { mode: 'up', start: 501, players: [], entries: [] };

export function loadGame(): Game {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_GAME, ...(JSON.parse(raw) as Partial<Game>) } : DEFAULT_GAME;
  } catch {
    return DEFAULT_GAME;
  }
}

export function saveGame(game: Game): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Storage is full or blocked; the game stays in memory only.
  }
}

// Return the first color that no player uses, or cycle through COLORS when all
// colors are in use.
export function nextColor(players: Player[]): string {
  const used = new Set(players.map((p) => p.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[players.length % COLORS.length];
}

export function total(game: Game, playerId: string): number {
  return game.entries.reduce((sum, e) => (e.playerId === playerId ? sum + e.value : sum), 0);
}

// In the 'up' mode the score is the total of the points. In the 'down' mode
// the points count down from the start value.
export function score(game: Game, playerId: string): number {
  const points = total(game, playerId);
  return game.mode === 'up' ? points : game.start - points;
}

// The ids of the players with the best score: the highest score in the 'up'
// mode, the lowest in the 'down' mode. Empty when all scores are equal.
export function leaders(game: Game): Set<string> {
  if (game.players.length < 2) return new Set();
  const scores = game.players.map((p) => score(game, p.id));
  const best = game.mode === 'up' ? Math.max(...scores) : Math.min(...scores);
  if (scores.every((s) => s === best)) return new Set();
  return new Set(game.players.filter((_, i) => scores[i] === best).map((p) => p.id));
}

export function addPlayer(game: Game, name: string, color: string): Game {
  return { ...game, players: [...game.players, { id: crypto.randomUUID(), name, color }] };
}

export function updatePlayer(game: Game, id: string, name: string, color: string): Game {
  return { ...game, players: game.players.map((p) => (p.id === id ? { ...p, name, color } : p)) };
}

export function removePlayer(game: Game, id: string): Game {
  return {
    ...game,
    players: game.players.filter((p) => p.id !== id),
    entries: game.entries.filter((e) => e.playerId !== id),
  };
}

// Move the player at index `from` to index `to`.
export function movePlayer(game: Game, from: number, to: number): Game {
  const players = [...game.players];
  const [player] = players.splice(from, 1);
  players.splice(to, 0, player);
  return { ...game, players };
}

export function addPoints(game: Game, playerId: string, value: number): Game {
  if (value === 0) return game;
  return { ...game, entries: [...game.entries, { playerId, value }] };
}

export function undo(game: Game): Game {
  return { ...game, entries: game.entries.slice(0, -1) };
}

// Start a new game with the same players and settings.
export function newGame(game: Game): Game {
  return { ...game, entries: [] };
}

export function setMode(game: Game, mode: Mode, start: number): Game {
  return { ...game, mode, start };
}
