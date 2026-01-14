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
export type {
  Theme,
  ThemeColors,
  ThemeStyleConfig,
  RGBAColor,
} from './theme.js';

export { DEFAULT_THEME_STYLES } from './theme.js';
