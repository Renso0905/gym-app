// Small SVG charts for the Progress tab. Drawn by hand so the app needs no
// chart library. Each chart is one series in the accent colour; tapping a bar
// or point shows its exact value in the line above the chart.
import { useEffect, useRef, useState, type MouseEvent } from 'react';

const HEIGHT = 150;
const TOP = 18;
const BOTTOM = 22;
const BASELINE = HEIGHT - BOTTOM;

/** The element's width in pixels, so charts are drawn at real size and text never scales. */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Index of the item whose x position is nearest to where the chart was tapped. */
function nearest(event: MouseEvent<SVGSVGElement>, xs: number[]): number {
  const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
  let best = 0;
  xs.forEach((candidate, i) => {
    if (Math.abs(candidate - x) < Math.abs(xs[best] - x)) best = i;
  });
  return best;
}

export interface ChartItem {
  /** Short label for the axis, e.g. "Nov 9". */
  label: string;
  value: number;
  /** Full description shown when selected, e.g. "Week of Nov 9: 12,500 lb". */
  detail: string;
}

interface ChartProps {
  items: ChartItem[];
  /** What the chart shows, for screen readers. */
  title: string;
  /** Writes an axis value, e.g. the maximum. */
  format: (value: number) => string;
}

/** A bar that is square on the baseline and rounded at the top. */
function barPath(x: number, width: number, top: number): string {
  const r = Math.min(4, width / 2, (BASELINE - top) / 2);
  return `M${x},${BASELINE} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${BASELINE} Z`;
}

/** Axis labels at the ends and a few in between, so they never collide. */
function axisLabels(items: ChartItem[], xs: number[], width: number) {
  const last = items.length - 1;
  const step = Math.max(1, Math.ceil(items.length / 3));
  return items.map((item, i) => {
    const shown = i === last || (i % step === 0 && last - i >= step / 2);
    if (!shown) return null;
    // The end labels sit against the edges so they are never cut off.
    const anchor = i === last && last > 0 ? 'end' : i === 0 ? 'start' : 'middle';
    const x = i === last && last > 0 ? width : i === 0 ? 0 : xs[i];
    return (
      <text key={i} className="chart-text" x={x} y={HEIGHT - 6} textAnchor={anchor}>
        {item.label}
      </text>
    );
  });
}

export function BarChart({ items, title, format }: ChartProps) {
  const [ref, width] = useWidth();
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < items.length ? picked : items.length - 1;
  const max = Math.max(0, ...items.map((item) => item.value));
  const slot = items.length > 0 ? width / items.length : 0;
  const barWidth = Math.max(2, Math.min(28, slot - 6));
  const xs = items.map((_, i) => slot * (i + 0.5));

  return (
    <div className="chart" ref={ref}>
      <p className="chart-detail" aria-live="polite">
        {items[selected]?.detail}
      </p>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={title} onClick={(event) => setPicked(nearest(event, xs))}>
          <line className="chart-grid" x1={0} x2={width} y1={TOP} y2={TOP} />
          <text className="chart-text" x={0} y={TOP - 6}>
            {format(max)}
          </text>
          {items.map((item, i) => {
            const top = max > 0 ? BASELINE - (item.value / max) * (BASELINE - TOP) : BASELINE;
            return item.value > 0 ? (
              <path key={i} className={i === selected ? 'chart-bar selected' : 'chart-bar'} d={barPath(xs[i] - barWidth / 2, barWidth, top)} />
            ) : null;
          })}
          <line className="chart-axis" x1={0} x2={width} y1={BASELINE} y2={BASELINE} />
          {axisLabels(items, xs, width)}
        </svg>
      )}
    </div>
  );
}

/** One value per session over time. The scale fits the values rather than starting at zero. */
export function LineChart({ items, title, format }: ChartProps) {
  const [ref, width] = useWidth();
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < items.length ? picked : items.length - 1;
  const values = items.map((item) => item.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const inset = 8;
  const xs = items.map((_, i) => (items.length === 1 ? width / 2 : inset + (i / (items.length - 1)) * (width - 2 * inset)));
  const plotTop = TOP + 8;
  // Room under the line for the minimum's label.
  const plotBottom = BASELINE - 22;
  const ys = values.map((value) => (max === min ? (plotTop + plotBottom) / 2 : plotBottom - ((value - min) / (max - min)) * (plotBottom - plotTop)));

  if (items.length === 0) return null;
  return (
    <div className="chart" ref={ref}>
      <p className="chart-detail" aria-live="polite">
        {items[selected]?.detail}
      </p>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={title} onClick={(event) => setPicked(nearest(event, xs))}>
          <line className="chart-grid" x1={0} x2={width} y1={TOP} y2={TOP} />
          <text className="chart-text" x={0} y={TOP - 6}>
            {format(max)}
          </text>
          {max !== min && (
            <text className="chart-text" x={0} y={BASELINE - 6}>
              {format(min)}
            </text>
          )}
          <line className="chart-axis" x1={0} x2={width} y1={BASELINE} y2={BASELINE} />
          <line className="chart-cursor" x1={xs[selected]} x2={xs[selected]} y1={TOP} y2={BASELINE} />
          <polyline className="chart-line" points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} />
          {(items.length <= 24 ? items : []).map((_, i) => (
            <circle key={i} className="chart-dot" cx={xs[i]} cy={ys[i]} r={3} />
          ))}
          <circle className="chart-dot selected" cx={xs[selected]} cy={ys[selected]} r={5} />
          {axisLabels(items, xs, width)}
        </svg>
      )}
    </div>
  );
}
