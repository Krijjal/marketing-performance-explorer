const WIDTH = 100;
const HEIGHT = 32;
// Room above and below the line, so the end dot is never clipped.
const PAD = 4;
// The scale always spans at least this share of the series' level, so a series
// that barely moves (CPC wobbling in the fourth decimal) draws as a flat line
// instead of being stretched into a dramatic one.
const MIN_RELATIVE_SPAN = 0.1;

interface SparklineProps {
  values: (number | null)[];
  imputed?: boolean[];
  colour: string;
  label: string;
}

// A week-by-week shape under a headline figure. The SVG stretches to the card,
// so the dots sit in HTML on top of it and stay round at any width.
export function Sparkline({ values, imputed = [], colour, label }: SparklineProps) {
  const known = values.filter((value): value is number => value !== null);
  if (known.length < 2) {
    return null;
  }
  const middle = (Math.min(...known) + Math.max(...known)) / 2;
  const span = Math.max(Math.max(...known) - Math.min(...known), Math.abs(middle) * MIN_RELATIVE_SPAN);
  const low = middle - span / 2;
  const x = (index: number) => (values.length === 1 ? WIDTH / 2 : (index / (values.length - 1)) * WIDTH);
  const y = (value: number) =>
    span === 0 ? HEIGHT / 2 : PAD + (1 - (value - low) / span) * (HEIGHT - PAD * 2);

  const points = values
    .map((value, index) => (value === null ? null : { x: x(index), y: y(value), index }))
    .filter((point) => point !== null);
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1)!.x},${HEIGHT} L${points[0]!.x},${HEIGHT} Z`;
  const last = points.at(-1)!;

  return (
    <div role="img" aria-label={label} className="reveal relative h-8 w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path d={area} fill={colour} fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke={colour}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points
        .filter((point) => imputed[point.index])
        .map((point) => (
          <span
            key={point.index}
            aria-hidden="true"
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] bg-surface"
            style={{ left: `${point.x}%`, top: `${(point.y / HEIGHT) * 100}%`, borderColor: colour }}
          />
        ))}
      <span
        aria-hidden="true"
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
        style={{ left: `${last.x}%`, top: `${(last.y / HEIGHT) * 100}%`, backgroundColor: colour }}
      />
    </div>
  );
}
