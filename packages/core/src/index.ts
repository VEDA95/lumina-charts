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
  PieChart,
  CandlestickChart,
  BoxplotChart,
  HeatmapChart,
  NetworkChart,
  GridRenderPass,
  BarRenderPass,
  HistogramRenderPass,
  HistogramLinePass,
  PieRenderPass,
  CandlestickRenderPass,
  BoxplotRenderPass,
  HeatmapRenderPass,
  EdgeRenderPass,
  NodeRenderPass,
  ForceLayout,
  RadialLayout,
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
  PieRenderPassConfig,
  CandlestickRenderPassConfig,
  BoxplotRenderPassConfig,
  HeatmapRenderPassConfig,
  EdgeRenderPassConfig,
  NodeRenderPassConfig,
} from './charts/index.js';

// Axes
export { AxisRenderer } from './axes/index.js';
export type { AxisRendererConfig } from './axes/index.js';

// Scales
export {
  LinearScale,
  LogScale,
  PowScale,
  SymlogScale,
  TimeScale,
  BandScale,
  ScaleFactory,
} from './scales/index.js';

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
export { BAR_SHADER, BAR_WITH_BORDER_SHADER, BAR_ROUNDED_SHADER } from './shaders/bar.js';
export { PIE_SHADER, PIE_WITH_BORDER_SHADER } from './shaders/pie.js';
export { CANDLESTICK_BODY_SHADER, CANDLESTICK_WICK_SHADER, CANDLESTICK_BODY_BORDER_SHADER } from './shaders/candlestick.js';
export { BOXPLOT_BOX_SHADER, BOXPLOT_LINE_SHADER, BOXPLOT_OUTLIER_SHADER } from './shaders/boxplot.js';
export { HEATMAP_CELL_SHADER } from './shaders/heatmap.js';
export { NETWORK_NODE_SHADER, NETWORK_EDGE_SHADER } from './shaders/network.js';
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
  // Scale types
  ScaleType,
  ScaleConfig,
  Scale,
  ContinuousScale,
  TimeScale as TimeScaleType,
  BandScale as BandScaleType,
  LinearScaleConfig,
  LogScaleConfig,
  PowScaleConfig,
  SqrtScaleConfig,
  SymlogScaleConfig,
  TimeScaleConfig,
  BandScaleConfig,
  // Pie chart types
  PieSlice,
  PieLabelConfig,
  PieChartOptions,
  PieChartConfig,
  PieSliceEvent,
  PieVertexData,
  // Candlestick chart types
  OHLCDataPoint,
  Candle,
  CandlestickOrientation,
  CandlestickChartOptions,
  CandlestickChartConfig,
  CandleEvent,
  CandlestickVertexData,
  // Boxplot chart types
  QuartileDataPoint,
  Boxplot,
  BoxplotOrientation,
  BoxplotChartOptions,
  BoxplotChartConfig,
  BoxplotEvent,
  BoxplotVertexData,
  // Heatmap chart types
  HeatmapDataPoint,
  HeatmapMatrixData,
  ColorScaleType,
  ColorScaleConfig,
  HeatmapCell,
  HeatmapChartOptions,
  HeatmapChartConfig,
  HeatmapCellEvent,
  HeatmapVertexData,
  // Network chart types
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
} from './types/index.js';

export { DEFAULT_THEME_STYLES } from './types/index.js';
export { SEQUENTIAL_BLUE, SEQUENTIAL_GREEN, DIVERGING_RWB, VIRIDIS, PLASMA } from './types/index.js';
export { DEFAULT_GROUP_COLORS } from './types/index.js';

// Utils
export { EventEmitter, ChartEvent, addManagedListener } from './utils/EventEmitter.js';
export type { ListenerOptions } from './utils/EventEmitter.js';
export * from './utils/math.js';
export * from './utils/dom.js';
export * from './utils/validation.js';

// Components
export { Legend } from './components/index.js';
export type { LegendItem, LegendOptions, LegendVisibilityCallback } from './components/index.js';

// Themes
export {
  SHADCN_COLORS_RGBA,
  SHADCN_COLORS_HEX,
  SHADCN_THEME_CONFIG,
  SHADCN_THEME_COLORS,
  SHADCN_THEME_STYLES,
  SHADCN_THEME,
  SHADCN_DARK_THEME_COLORS,
  SHADCN_DARK_THEME_CONFIG,
  SHADCN_DARK_THEME,
  getShadcnGridColor,
  applyShadcnTooltipStyles,
  formatShadcnTooltipContent,
} from './themes/index.js';

// Animations
export {
  DomainAnimator,
  linear,
  easeOut,
  easeIn,
  easeInOut,
  easeOutQuad,
  easeInQuad,
  easeInOutQuad,
} from './animations/index.js';
export type { AnimationConfig, EasingFunction } from './animations/index.js';
