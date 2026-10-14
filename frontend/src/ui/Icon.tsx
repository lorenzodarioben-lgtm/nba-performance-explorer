// A small, consistent line-icon set (1.6px stroke, 24px grid). Icons are decorative unless a
// label is supplied, in which case they carry an accessible name.
const PATHS = {
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.8-4.8',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 8h16M4 16h16',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  star: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  compare: 'M7 7h12l-3-3M17 17H5l3 3',
  filter: 'M4 6h16M7 12h10M10 18h4',
  check: 'm5 12.5 4.5 4.5L19 7',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  court: 'M3 5h18v14H3zM12 5v14M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z',
  play: 'M8 5.5v13l10-6.5z',
  info: 'M12 8v.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  motion: 'M4 12h3l2-6 4 12 2-6h5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  label,
  className,
  filled = false,
}: {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
