/**
 * @lumina-charts/react - React wrapper for Lumina Charts
 *
 * High-performance WebGL-based charting components for React
 *
 * @packageDocumentation
 */

// Chart components
export {
  ScatterChart,
  LineChart,
  BarChart,
  HistogramChart,
  BubbleChart,
  PieChart,
  CandlestickChart,
  BoxplotChart,
  HeatmapChart,
  NetworkChart,
  type ScatterChartRef,
  type LineChartRef,
  type BarChartRef,
  type HistogramChartRef,
  type BubbleChartRef,
  type PieChartRef,
  type CandlestickChartRef,
  type BoxplotChartRef,
  type HeatmapChartRef,
  type NetworkChartRef,
} from './components/index.js';

// Interaction components
export {
  ZoomInteraction,
  PanInteraction,
  HoverInteraction,
  SelectionInteraction,
} from './components/index.js';

// Factory (for custom chart components)
export { createChartComponent, type ChartRef } from './components/index.js';

// Hooks
export { useChart, useChartEvent } from './hooks/index.js';

// Context (for advanced use cases)
export { ChartContext, useChartContext } from './context/ChartContext.js';

// Types
export type {
  // React component props
  BaseChartProps,
  ScatterChartProps,
  LineChartProps,
  BarChartProps,
  HistogramChartProps,
  BubbleChartProps,
  PieChartProps,
  CandlestickChartProps,
  BoxplotChartProps,
  HeatmapChartProps,
  NetworkChartProps,
  // Interaction props
  ZoomInteractionProps,
  PanInteractionProps,
  HoverInteractionProps,
  SelectionInteractionProps,
  // Re-exported core types
  Series,
  DataPoint,
  SeriesStyle,
  ChartOptions,
  DataDomain,
  Margins,
  AxisConfig,
  GridConfig,
  ThemeConfig,
  TooltipConfig,
  LegendConfig,
  HoverEvent,
  ZoomEvent,
  PanEvent,
  SelectionEvent,
  DataUpdateEvent,
  ResizeEvent,
  PointEvent,
  ChartEvents,
  HitTestResult,
  RGBAColor,
  ZoomHandlerConfig,
  PanHandlerConfig,
  HoverHandlerConfig,
  SelectionHandlerConfig,
  ScatterChartOptions,
  LineChartOptions,
  BarChartOptions,
  HistogramChartOptions,
  BubbleChartOptions,
  PieChartOptions,
  CandlestickChartOptions,
  BoxplotChartOptions,
  HeatmapChartOptions,
  NetworkChartOptions,
} from './types/index.js';
