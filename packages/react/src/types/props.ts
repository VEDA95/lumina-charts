import type { CSSProperties, ReactNode } from 'react';
import type {
  Series,
  ChartOptions,
  HoverEvent,
  ZoomEvent,
  PanEvent,
  SelectionEvent,
  DataUpdateEvent,
  ResizeEvent,
  PointEvent,
  DataPoint,
} from '@lumina-charts/core';

/**
 * Base props for all chart components
 */
export interface BaseChartProps<TOptions extends ChartOptions = ChartOptions> {
  /** Chart data as series array */
  data?: Series[];
  /** Chart configuration options */
  options?: TOptions;
  /** Container width (CSS value or number in pixels) */
  width?: string | number;
  /** Container height (CSS value or number in pixels) */
  height?: string | number;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles for the container */
  style?: CSSProperties;
  /** Enable animations */
  animate?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Children (interaction components, etc.) */
  children?: ReactNode;

  // Event handlers
  /** Called when hovering over data points */
  onHover?: (event: HoverEvent) => void;
  /** Called when hover ends */
  onHoverEnd?: () => void;
  /** Called when clicking on a data point */
  onClick?: (event: PointEvent) => void;
  /** Called when zoom changes */
  onZoom?: (event: ZoomEvent) => void;
  /** Called when panning */
  onPan?: (event: PanEvent) => void;
  /** Called when selection changes */
  onSelectionChange?: (event: SelectionEvent) => void;
  /** Called when data updates */
  onDataUpdate?: (event: DataUpdateEvent) => void;
  /** Called when container resizes */
  onResize?: (event: ResizeEvent) => void;
  /** Called when chart is ready */
  onReady?: () => void;
  /** Called before chart is destroyed */
  onDestroy?: () => void;
}

/**
 * Props for ScatterChart
 */
export interface ScatterChartProps<T extends DataPoint = DataPoint>
  extends BaseChartProps {
  /** Scatter chart data */
  data?: Series<T>[];
}

/**
 * Props for LineChart
 */
export interface LineChartProps<T extends DataPoint = DataPoint>
  extends BaseChartProps {
  /** Line chart data */
  data?: Series<T>[];
}

/**
 * Props for BarChart
 */
export interface BarChartProps<T extends DataPoint = DataPoint>
  extends BaseChartProps {
  /** Bar chart data */
  data?: Series<T>[];
}

/**
 * Props for HistogramChart
 */
export interface HistogramChartProps<T extends DataPoint = DataPoint>
  extends BaseChartProps {
  /** Histogram data */
  data?: Series<T>[];
}

/**
 * Props for BubbleChart
 */
export interface BubbleChartProps<T extends DataPoint = DataPoint>
  extends BaseChartProps {
  /** Bubble chart data */
  data?: Series<T>[];
}

/**
 * Props for PieChart
 */
export interface PieChartProps extends BaseChartProps {
  /** Pie chart data - typically a single series with slice values */
  data?: Series[];
}

/**
 * Props for CandlestickChart
 */
export interface CandlestickChartProps extends BaseChartProps {
  /** Candlestick (OHLC) data */
  data?: Series[];
}

/**
 * Props for BoxplotChart
 */
export interface BoxplotChartProps extends BaseChartProps {
  /** Boxplot data with quartile information */
  data?: Series[];
}

/**
 * Props for HeatmapChart
 */
export interface HeatmapChartProps extends BaseChartProps {
  /** Heatmap matrix data */
  data?: Series[];
}

/**
 * Props for NetworkChart
 */
export interface NetworkChartProps extends BaseChartProps {
  /** Network graph data */
  data?: Series[];
}
