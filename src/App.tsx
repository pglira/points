import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import {
  COLORS,
  type Game,
  type Mode,
  addPlayer,
  addPoints,
  leaders,
  loadGame,
  newGame,
  nextColor,
  removePlayer,
  saveGame,
  score,
  setMode,
  undo,
  updatePlayer,
} from './game';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, string> = { auto: '◐', light: '☀︎', dark: '☾︎' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// Changes of the score for the step buttons of a person, in rows of three.
const STEPS = [-10, -5, -1, 1, 5, 10];

// The open sheet: points of a player, a player form (id null for a new
// player) or the settings.
type Sheet =
  | { kind: 'points'; id: string }
  | { kind: 'player'; id: string | null }
  | { kind: 'settings' }
  | null;

export default function App() {
  const [game, setGame] = useState<Game>(loadGame);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveGame(game), [game]);

  const best = leaders(game);
  const close = () => setSheet(null);
  const sheetPlayer =
    sheet && sheet.kind !== 'settings' ? game.players.find((p) => p.id === sheet.id) : undefined;

  return (
    <main>
      <header>
        <h1>Points</h1>
        <div className="header-buttons">
          <button
            className="icon"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            {THEME_ICONS[theme]}
          </button>
          <button
            className="icon"
            onClick={() => setSheet({ kind: 'settings' })}
            aria-label="Settings"
            title="Settings"
          >
            ⚙{'︎'}
          </button>
          <button
            className="add"
            onClick={() => setSheet({ kind: 'player', id: null })}
            aria-label="Add person"
          >
            +
          </button>
        </div>
      </header>

      <div className="toolbar">
        <span>{game.mode === 'up' ? 'Counting up' : `Counting down from ${game.start}`}</span>
        <button onClick={() => setGame(undo)} disabled={game.entries.length === 0}>
          ↶ Undo
        </button>
      </div>

      {game.players.length === 0 && (
        <p className="empty">No persons. Tap + to add a person.</p>
      )}

      <ul>
        {game.players.map((player) => {
          const value = score(game, player.id);
          const leader = best.has(player.id);
          return (
            <li
              key={player.id}
              className={`player${leader ? ' leader' : ''}`}
              style={{ '--color': player.color } as CSSProperties}
            >
              <button
                className="info"
                onClick={() => setSheet({ kind: 'points', id: player.id })}
                aria-label={`Enter points for ${player.name}`}
              >
                <span className="name">
                  {leader && <span className="star">★ </span>}
                  {player.name}
                </span>
                <span className="score">{value}</span>
              </button>
              <div className="steps">
                {STEPS.map((step) => (
                  <button
                    key={step}
                    className={step * (game.mode === 'up' ? 1 : -1) > 0 ? 'step primary' : 'step'}
                    onClick={() =>
                      setGame((g) => addPoints(g, player.id, game.mode === 'up' ? step : -step))
                    }
                    aria-label={`${step > 0 ? 'Plus' : 'Minus'} ${Math.abs(step)}`}
                  >
                    {step > 0 ? `+${step}` : `−${-step}`}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {sheet?.kind === 'points' && sheetPlayer && (
        <PointsForm
          key={sheetPlayer.id}
          name={sheetPlayer.name}
          mode={game.mode}
          current={score(game, sheetPlayer.id)}
          onCancel={close}
          onEdit={() => setSheet({ kind: 'player', id: sheetPlayer.id })}
          onSave={(value) => {
            setGame((g) => addPoints(g, sheetPlayer.id, value));
            close();
          }}
        />
      )}

      {sheet?.kind === 'player' && (
        <PlayerForm
          key={sheet.id ?? 'new'}
          name={sheetPlayer?.name ?? ''}
          color={sheetPlayer?.color ?? nextColor(game.players)}
          onCancel={close}
          onSave={(name, color) => {
            setGame((g) =>
              sheetPlayer ? updatePlayer(g, sheetPlayer.id, name, color) : addPlayer(g, name, color),
            );
            close();
          }}
          onDelete={
            sheetPlayer
              ? () => {
                  setGame((g) => removePlayer(g, sheetPlayer.id));
                  close();
                }
              : undefined
          }
        />
      )}

      {sheet?.kind === 'settings' && (
        <SettingsForm
          mode={game.mode}
          start={game.start}
          onCancel={close}
          onSave={(mode, start) => {
            setGame((g) => setMode(g, mode, start));
            close();
          }}
          onNewGame={() => {
            setGame(newGame);
            close();
          }}
        />
      )}
    </main>
  );
}

function SheetFrame(props: {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit();
        }}
      >
        <h2>{props.title}</h2>
        {props.children}
      </form>
    </div>
  );
}

const toInt = (v: string) => Math.floor(Number(v) || 0);

interface PointsFormProps {
  name: string;
  mode: Mode;
  current: number;
  onSave: (value: number) => void;
  onEdit: () => void;
  onCancel: () => void;
}

// Keys of the keypad, in rows of four. 'back' removes the last digit, 'clear'
// removes all digits.
const KEYS = ['7', '8', '9', 'back', '4', '5', '6', '-', '1', '2', '3', '+', '0', 'clear'];
const KEY_LABELS: Record<string, string> = { back: '⌫', clear: 'C', '-': '−', '+': '+' };
const MAX_DIGITS = 6;

// Enter the points of one round with a keypad. In the 'down' mode the points
// reduce the score. A hardware keyboard can also enter the points.
function PointsForm({ name, mode, current, onSave, onEdit, onCancel }: PointsFormProps) {
  const [digits, setDigits] = useState('');
  const [negative, setNegative] = useState(false);
  const value = (negative ? -1 : 1) * Number(digits || 0);
  const next = mode === 'up' ? current + value : current - value;

  const press = (key: string) => {
    if (key === 'back') setDigits((d) => d.slice(0, -1));
    else if (key === 'clear') setDigits('');
    else if (key === '-') setNegative(true);
    else if (key === '+') setNegative(false);
    else setDigits((d) => (d.length < MAX_DIGITS ? (d + key).replace(/^0+/, '') : d));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9+-]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Delete') press('clear');
      else if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') document.querySelector<HTMLFormElement>('form.sheet')?.requestSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <SheetFrame title={name} onCancel={onCancel} onSubmit={() => value !== 0 && onSave(value)}>
      <div className="points-display" aria-live="polite">
        <span className="points-label">{mode === 'up' ? 'Points to add' : 'Points to subtract'}</span>
        <output className={negative ? 'negative' : undefined}>
          {negative ? '−' : '+'}
          {digits || '0'}
        </output>
      </div>
      <div className="keypad">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={
              key === '0'
                ? 'key zero'
                : key === '-' && negative
                  ? 'key on negative'
                  : key === '+' && !negative
                    ? 'key on'
                    : 'key'
            }
            onClick={() => press(key)}
            aria-label={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear' : undefined}
          >
            {KEY_LABELS[key] ?? key}
          </button>
        ))}
      </div>
      <p className="preview">
        Score: {current} → <strong>{next}</strong>
      </p>
      <div className="buttons">
        <button type="button" className="secondary-left" onClick={onEdit}>
          Edit person
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={value === 0}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

interface PlayerFormProps {
  name: string;
  color: string;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function PlayerForm(props: PlayerFormProps) {
  const [name, setName] = useState(props.name);
  const [color, setColor] = useState(props.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <SheetFrame
      title={props.onDelete ? 'Edit person' : 'New person'}
      onCancel={props.onCancel}
      onSubmit={() => props.onSave(name.trim() || 'Person', color)}
    >
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Person" />
      </label>
      <div className="colors" role="radiogroup" aria-label="Color">
        {COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Color ${i + 1}`}
            className="swatch"
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="buttons">
        {props.onDelete && (
          <button
            type="button"
            className="delete"
            onClick={() => (confirmDelete ? props.onDelete?.() : setConfirmDelete(true))}
          >
            {confirmDelete ? 'Tap to delete' : 'Delete'}
          </button>
        )}
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary">
          Save
        </button>
      </div>
    </SheetFrame>
  );
}

interface SettingsFormProps {
  mode: Mode;
  start: number;
  onSave: (mode: Mode, start: number) => void;
  onNewGame: () => void;
  onCancel: () => void;
}

function SettingsForm(props: SettingsFormProps) {
  const [mode, setModeValue] = useState(props.mode);
  const [start, setStart] = useState(String(props.start));
  const [confirmNew, setConfirmNew] = useState(false);
  const startValue = Math.max(0, toInt(start));
  const valid = mode === 'up' || startValue > 0;

  return (
    <SheetFrame
      title="Settings"
      onCancel={props.onCancel}
      onSubmit={() => valid && props.onSave(mode, startValue)}
    >
      <div className="segmented" role="radiogroup" aria-label="Count direction">
        {(['up', 'down'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={m === mode}
            onClick={() => setModeValue(m)}
          >
            {m === 'up' ? '↑ Up from 0' : '↓ Down from a start value'}
          </button>
        ))}
      </div>
      {mode === 'down' && (
        <label>
          Start value
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={start}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
      )}
      <div className="buttons">
        <button
          type="button"
          className="delete"
          onClick={() => (confirmNew ? props.onNewGame() : setConfirmNew(true))}
        >
          {confirmNew ? 'Tap to clear all points' : 'New game'}
        </button>
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!valid}>
          Save
        </button>
      </div>
    </SheetFrame>
  );
}
