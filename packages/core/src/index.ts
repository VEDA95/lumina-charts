/**
 * Lumina Charts - High-performance WebGL chart library
 *
 * @packageDocumentation
 */

// Charts
export {
  BaseChart,
  ScatterChart,
  LineChart,
  BarChart,
  HistogramChart,
  BubbleChart,
  GridRenderPass,
  BarRenderPass,
  HistogramRenderPass,
  HistogramLinePass,
  binData,
  sturgesBinCount,
  scottBinCount,
  freedmanDiaconisBinCount,
  calculateKDE,
  scaleKDEToHistogram,
  calculateCumulative,
  calculateEmpiricalCDF,
} from './charts/index.js';
export type {
  BaseChartConfig,
  InteractionHandler,
  ExportImageOptions,
  ScatterChartOptions,
  ScatterChartConfig,
  PointShape,
  ScatterRenderPassConfig,
  GridRenderPassConfig,
  LineChartOptions,
  LineChartConfig,
  LineRenderPassConfig,
  BarChartOptions,
  BarChartConfig,
  BarRenderPassConfig,
  BarData,
  HistogramChartOptions,
  HistogramChartConfig,
  HistogramRenderPassConfig,
  HistogramBarData,
  HistogramLinePassConfig,
  OverlayCurve,
  BinConfig,
  Bin,
  BinResult,
  KDEConfig,
  CurvePoint,
  BubbleChartOptions,
  BubbleChartConfig,
  BubbleSizeConfig,
} from './charts/index.js';

// Axes
export { AxisRenderer } from './axes/index.js';
export type { AxisRendererConfig } from './axes/index.js';

// Interactions
export {
  BaseInteractionHandler,
  HoverHandler,
  PanHandler,
  ZoomHandler,
  SelectionHandler,
} from './interactions/index.js';
export type {
  HoverHandlerConfig,
  PanHandlerConfig,
  ZoomHandlerConfig,
  SelectionHandlerConfig,
} from './interactions/index.js';

// Data processing
export { DataProcessor } from './data/DataProcessor.js';
export { SpatialIndex } from './data/SpatialIndex.js';
export { LODManager, douglasPeuckerDecimate, gridBasedDecimate } from './data/LODManager.js';
export type {
  ProcessPointOptions,
  ProcessLineOptions,
} from './data/DataProcessor.js';
export type { IndexedPoint, SpatialHitResult, BoundingBox } from './data/SpatialIndex.js';
export type { LODLevel, LODConfig } from './data/LODManager.js';

// Renderer
export { WebGLRenderer } from './renderer/WebGLRenderer.js';
export { ShaderCache } from './renderer/ShaderCache.js';
export { BufferPool, createAttributeLayout, calculateStride } from './renderer/BufferPool.js';

// Shaders
export { POINT_SHADER, POINT_WITH_STROKE_SHADER, INSTANCED_POINT_SHADER } from './shaders/point.js';
export { LINE_SHADER, SIMPLE_LINE_SHADER, DASHED_LINE_SHADER, AREA_SHADER, GRADIENT_AREA_SHADER } from './shaders/line.js';
export { GRID_SHADER, DASHED_GRID_SHADER, CROSSHAIR_SHADER, SELECTION_SHADER, ZOOM_LENS_SHADER } from './shaders/grid.js';
export { BAR_SHADER, BAR_WITH_BORDER_SHADER } from './shaders/bar.js';
export { buildVertexShader, buildFragmentShader } from './shaders/common.js';

// Types
export type {
  // Data types
  DataPoint,
  BubbleDataPoint,
  Series,
  SeriesStyle,
  PointShape as PointShapeType,
  DataDomain,
  GPUBuffer,
  BufferLayout,
  AttributeLayout,
  ProcessedSeriesData,
  // Renderer types
  WebGLRendererConfig,
  RenderContext,
  RenderPass,
  ShaderProgram,
  UniformValue,
  ShaderSource,
  Viewport,
  // Chart types
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
  // Event types
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
  // Theme types
  Theme,
  ThemeColors,
  ThemeStyleConfig,
  RGBAColor,
} from './types/index.js';

export { DEFAULT_THEME_STYLES } from './types/index.js';

// Utils
export { EventEmitter, ChartEvent, addManagedListener } from './utils/EventEmitter.js';
export type { ListenerOptions } from './utils/EventEmitter.js';
export * from './utils/math.js';
export * from './utils/dom.js';
export * from './utils/validation.js';
