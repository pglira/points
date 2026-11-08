// Line icons on a 24 × 24 grid with one stroke width and square ends, so that
// all icons have the same weight. The icons use the current text color.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  auto: 'M12 4a8 8 0 0 1 0 16a8 8 0 0 1 0-16zM12 4v16',
  sun: 'M12 8a4 4 0 0 1 0 8a4 4 0 0 1 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  moon: 'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z',
  settings: 'M4 7h4M12 7h8M4 17h8M16 17h4M8 5h4v4H8zM12 15h4v4h-4z',
  undo: 'M8 5L4 9l4 4M4 9h10a5 5 0 0 1 0 10H9',
  restart: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
  star: 'M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6-5-2.9-5 2.9 1.2-5.6L4 9.6l5.6-.6z',
  edit: 'M4 20v-4L15 5l4 4L8 20zM12 8l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M5 12l5 5L19 7',
  sort: 'M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4',
  grip: 'M4 8h16M4 12h16M4 16h16',
  chart: 'M4 4v16h16M7 15l4-4 3 3 5-6',
  backspace: 'M8 6h12v12H8l-5-6zM11 9l6 6M17 9l-6 6',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="svg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
