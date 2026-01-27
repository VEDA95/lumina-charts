/**
 * Core type exports
 */

// Data types
export type {
  DataPoint,
  BubbleDataPoint,
  Series,
  SeriesStyle,
  PointShape,
  DataDomain,
  GPUBuffer,
  BufferLayout,
  AttributeLayout,
  ProcessedSeriesData,
} from './data.js';

// Scale types
export type {
  ScaleType,
  ScaleConfig,
  BaseScaleConfig,
  LinearScaleConfig,
  LogScaleConfig,
  PowScaleConfig,
  SqrtScaleConfig,
  SymlogScaleConfig,
  TimeScaleConfig,
  BandScaleConfig,
  Scale,
  ContinuousScale,
  TimeScale,
  BandScale,
} from './scale.js';

// Renderer types
export type {
  WebGLRendererConfig,
  RenderContext,
  RenderPass,
  ShaderProgram,
  UniformValue,
  ShaderSource,
  Viewport,
} from './renderer.js';

// Chart types
export type {
  Margins,
  ChartOptions,
  ThemeConfig,
  ThemeStyles,
  InteractionConfig,
  PanConfig,
  ZoomConfig,
  SelectConfig,
  TooltipConfig,
  TooltipContent,
  TooltipItem,
  LegendConfig,
  AxisConfig,
  TickConfig,
  GridConfig,
  ChartState,
  HitTestResult,
  ChartType,
} from './chart.js';

// Event types
export type {
  ChartEvents,
  BaseChartEvent,
  PointEvent,
  HoverEvent,
  SelectionEvent,
  ZoomEvent,
  PanEvent,
  DataUpdateEvent,
  ResizeEvent,
  InteractionEvent,
} from './events.js';

// Theme types
export type { Theme, ThemeColors, ThemeStyleConfig, RGBAColor } from './theme.js';

export { DEFAULT_THEME_STYLES } from './theme.js';

// Pie chart types
export type {
  PieSlice,
  PieLabelConfig,
  PieChartOptions,
  PieChartConfig,
  PieSliceEvent,
  PieVertexData,
} from './pie.js';

// Candlestick chart types
export type {
  OHLCDataPoint,
  Candle,
  CandlestickOrientation,
  CandlestickChartOptions,
  CandlestickChartConfig,
  CandleEvent,
  CandlestickVertexData,
} from './candlestick.js';

// Boxplot chart types
export type {
  QuartileDataPoint,
  Boxplot,
  BoxplotOrientation,
  BoxplotChartOptions,
  BoxplotChartConfig,
  BoxplotEvent,
  BoxplotVertexData,
} from './boxplot.js';

// Heatmap chart types
export type {
  HeatmapDataPoint,
  HeatmapMatrixData,
  ColorScaleType,
  ColorScaleConfig,
  HeatmapCell,
  HeatmapChartOptions,
  HeatmapChartConfig,
  HeatmapCellEvent,
  HeatmapVertexData,
} from './heatmap.js';

export { SEQUENTIAL_BLUE, SEQUENTIAL_GREEN, DIVERGING_RWB, VIRIDIS, PLASMA } from './heatmap.js';

// Network chart types
export type {
  NetworkNode,
  NetworkEdge,
  NetworkData,
  NetworkLayoutType,
  ForceLayoutConfig,
  RadialLayoutConfig,
  ProcessedNode,
  ProcessedEdge,
  NetworkChartOptions,
  NetworkChartConfig,
  NetworkNodeEvent,
  NetworkVertexData,
} from './network.js';

export { DEFAULT_GROUP_COLORS } from './network.js';
