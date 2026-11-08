import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { type Game, type Point, history, protocol, signed } from './game';

const HEIGHT = 200;
// Space for the axis labels, in pixels.
const LEFT = 40;
const RIGHT = 12;
const TOP = 10;
const BOTTOM = 24;
// The smallest time span of the x axis, so that entries in a short time do
// not stretch over the full width.
const MIN_SPAN_MS = 60_000;

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Round values for about `count` ticks between `min` and `max`.
function ticks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / count || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const result = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) result.push(v);
  return result;
}

// The score of a player at a time: the score after the last entry at or
// before that time.
function scoreAt(points: Point[], at: number): number {
  let value = points[0].score;
  for (const p of points) {
    if (p.at > at) break;
    value = p.score;
  }
  return value;
}

// A step chart of the score of each player over time. A tap or a pointer
// move on the chart shows the scores at that time.
function Chart({ game }: { game: Game }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lines = history(game);
  const all = [...lines.values()].flat();
  const t0 = game.entries[0].at;
  const t1 = Math.max(game.entries.at(-1)!.at, t0 + MIN_SPAN_MS);
  const scores = all.map((p) => p.score);
  const yTicks = ticks(Math.min(...scores), Math.max(...scores), 4);
  const lo = Math.min(...scores, ...yTicks);
  const hi = Math.max(...scores, ...yTicks, lo + 1);

  const x = (at: number) => LEFT + ((at - t0) / (t1 - t0)) * (width - LEFT - RIGHT);
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (HEIGHT - TOP - BOTTOM);
  const end = game.entries.at(-1)!.at;

  // Horizontal to the time of the next point, then vertical to its score.
  const path = (points: Point[]) =>
    points.map((p, i) => (i === 0 ? `M${x(p.at)},${y(p.score)}` : `H${x(p.at)}V${y(p.score)}`)).join('') +
    `H${x(end)}`;

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - LEFT) / (width - LEFT - RIGHT);
    setCursor(Math.min(end, Math.max(t0, t0 + ratio * (t1 - t0))));
  };

  const at = cursor ?? end;

  return (
    <div className="chart" ref={box}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label="Score of each person over time"
        onPointerDown={onPointer}
        onPointerMove={(e) => {
          if (e.buttons !== 0 || e.pointerType === 'mouse') onPointer(e);
        }}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setCursor(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid" x1={LEFT} x2={width - RIGHT} y1={y(v)} y2={y(v)} />
            <text className="axis" x={LEFT - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        <text className="axis" x={LEFT} y={HEIGHT - 6}>
          {time(t0)}
        </text>
        <text className="axis" x={width - RIGHT} y={HEIGHT - 6} textAnchor="end">
          {time(t1)}
        </text>
        {cursor !== null && (
          <line className="cursor" x1={x(cursor)} x2={x(cursor)} y1={TOP} y2={HEIGHT - BOTTOM} />
        )}
        {game.players.map((p) => {
          const points = lines.get(p.id)!;
          return (
            <g key={p.id}>
              <path className="line" d={path(points)} stroke={p.color} />
              <circle className="marker" cx={x(at)} cy={y(scoreAt(points, at))} r={4} fill={p.color} />
            </g>
          );
        })}
      </svg>
      <ul className="legend" aria-live="polite">
        <li className="legend-time">{time(at)}</li>
        {game.players.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
            <strong>{scoreAt(lines.get(p.id)!, at)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The chart of the scores and the list of all entries of the game, newest
// first.
export function Protocol({ game, onClose }: { game: Game; onClose: () => void }) {
  const rounds = protocol(game).reverse();
  const players = new Map(game.players.map((p) => [p.id, p]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onClick={onClose}>
      <section className="sheet protocol" onClick={(e) => e.stopPropagation()} aria-label="Protocol">
        <h2>Protocol</h2>
        {game.entries.length === 0 ? (
          <p className="protocol-empty">No points in this game yet.</p>
        ) : (
          <>
            <Chart game={game} />
            <table className="rounds">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Person</th>
                  <th className="number">Points</th>
                  <th className="number">Score</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, i) => {
                  const player = players.get(r.playerId);
                  return (
                    <tr key={rounds.length - i}>
                      <td className="muted">{time(r.at)}</td>
                      <td>
                        <span className="dot" style={{ background: player?.color }} />
                        {player?.name}
                      </td>
                      <td className="number">{signed(r.change)}</td>
                      <td className="number">
                        <strong>{r.score}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
        <div className="buttons">
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
