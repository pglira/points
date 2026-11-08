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
  // Time of the input in milliseconds since the epoch.
  at: number;
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
    if (!raw) return DEFAULT_GAME;
    const game = { ...DEFAULT_GAME, ...(JSON.parse(raw) as Partial<Game>) };
    // An entry without a time gets the time of the load.
    const now = Date.now();
    return { ...game, entries: game.entries.map((e) => ({ ...e, at: e.at ?? now })) };
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

// The score that belongs to a total of points: the total in the 'up' mode,
// the start value minus the total in the 'down' mode.
export function scoreOf(game: Game, points: number): number {
  return game.mode === 'up' ? points : game.start - points;
}

export function score(game: Game, playerId: string): number {
  return scoreOf(game, total(game, playerId));
}

// One row of the protocol: consecutive entries of one player, each no more
// than MERGE_MS after the one before.
export interface Round {
  playerId: string;
  // Times of the first and the last entry.
  first: number;
  last: number;
  // Change of the score and the score after the last entry.
  change: number;
  score: number;
}

const MERGE_MS = 10_000;

// The rows of the protocol, oldest first.
export function protocol(game: Game): Round[] {
  const totals = new Map<string, number>();
  const rounds: Round[] = [];
  for (const e of game.entries) {
    const points = (totals.get(e.playerId) ?? 0) + e.value;
    totals.set(e.playerId, points);
    const change = scoreOf(game, e.value) - scoreOf(game, 0);
    const prev = rounds.at(-1);
    if (prev && prev.playerId === e.playerId && e.at - prev.last <= MERGE_MS) {
      prev.last = e.at;
      prev.change += change;
      prev.score = scoreOf(game, points);
    } else {
      rounds.push({ playerId: e.playerId, first: e.at, last: e.at, change, score: scoreOf(game, points) });
    }
  }
  return rounds;
}

// A point of the score history of a player.
export interface Point {
  at: number;
  score: number;
}

// The score of each player after each of its entries, oldest first. The
// first point of each player is the start score at the time of the first
// entry of the game.
export function history(game: Game): Map<string, Point[]> {
  const start = game.entries[0]?.at ?? Date.now();
  const totals = new Map<string, number>();
  const result = new Map<string, Point[]>(
    game.players.map((p) => [p.id, [{ at: start, score: scoreOf(game, 0) }]]),
  );
  for (const e of game.entries) {
    const points = (totals.get(e.playerId) ?? 0) + e.value;
    totals.set(e.playerId, points);
    result.get(e.playerId)?.push({ at: e.at, score: scoreOf(game, points) });
  }
  return result;
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
  return { ...game, entries: [...game.entries, { playerId, value, at: Date.now() }] };
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
