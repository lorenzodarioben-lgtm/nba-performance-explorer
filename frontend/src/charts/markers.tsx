// Series marker shapes, so a series is identified by shape and dash as well as by colour.
export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';

export function markerPath(shape: MarkerShape, x: number, y: number, r: number) {
  switch (shape) {
    case 'square':
      return `M${x - r} ${y - r}h${r * 2}v${r * 2}h${-r * 2}Z`;
    case 'triangle':
      return `M${x} ${y - r * 1.2}L${x + r * 1.15} ${y + r * 0.9}L${x - r * 1.15} ${y + r * 0.9}Z`;
    case 'diamond':
      return `M${x} ${y - r * 1.3}L${x + r * 1.3} ${y}L${x} ${y + r * 1.3}L${x - r * 1.3} ${y}Z`;
    default:
      return `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }
}

/** Inline legend key: the series line (with its dash) and its marker. */
export function LegendKey({
  color,
  dash,
  shape = 'circle',
}: {
  color: string;
  dash?: string | undefined;
  shape?: MarkerShape | undefined;
}) {
  return (
    <svg
      width="28"
      height="12"
      viewBox="0 0 28 12"
      aria-hidden="true"
      className="legend-key"
    >
      <line
        x1="1"
        x2="27"
        y1="6"
        y2="6"
        stroke={color}
        strokeWidth="2.25"
        strokeDasharray={dash}
      />
      <path
        d={markerPath(shape, 14, 6, 3.6)}
        fill={color}
        stroke="#111114"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function ChartLegend({
  items,
}: {
  items: readonly {
    id: string;
    label: string;
    color: string;
    dash?: string | undefined;
    shape?: MarkerShape | undefined;
  }[];
}) {
  return (
    <ul className="chart-legend" aria-label="Legend">
      {items.map((item) => (
        <li key={item.id}>
          <LegendKey color={item.color} dash={item.dash} shape={item.shape} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
