/**
 * Core data types for Lumina Charts
 */

/**
 * Base data point with x/y coordinates
 */
export interface DataPoint {
  x: number;
  y: number;
  [key: string]: number | string | boolean | null | undefined;
}

/**
 * Data point with z-value for bubble charts
 * The z-value determines the bubble size
 */
export interface BubbleDataPoint extends DataPoint {
  /** Z-value that determines bubble size */
  z: number;
}

/**
 * A series of data points with metadata
 */
export interface Series<T extends DataPoint = DataPoint> {
  /** Unique identifier for the series */
  id: string;
  /** Display name for the series */
  name: string;
  /** Array of data points */
  data: T[];
  /** Whether the series is visible */
  visible?: boolean;
  /** Optional series-specific styling */
  style?: SeriesStyle;
}

/**
 * Series-specific styling options
 */
export interface SeriesStyle {
  /** Line/stroke color */
  color?: string;
  /** Line width in pixels */
  lineWidth?: number;
  /** Point size in pixels */
  pointSize?: number;
  /** Point shape */
  pointShape?: PointShape;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Whether to show the line */
  showLine?: boolean;
  /** Whether to show points */
  showPoints?: boolean;
}

/**
 * Available point shapes
 */
export type PointShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'star';

/**
 * Domain bounds for x and y axes
 */
export interface DataDomain {
  x: [number, number];
  y: [number, number];
}

/**
 * GPU buffer representation
 */
export interface GPUBuffer {
  /** WebGL buffer object */
  buffer: WebGLBuffer;
  /** Allocated size in bytes */
  size: number;
  /** Buffer usage hint (STATIC_DRAW, DYNAMIC_DRAW, etc.) */
  usage: number;
  /** Stride between elements in bytes */
  stride: number;
}

/**
 * Layout of attributes in a buffer
 */
export interface BufferLayout {
  /** Array of attribute definitions */
  attributes: AttributeLayout[];
  /** Total stride in bytes */
  stride: number;
  /** Instance divisor for instanced rendering */
  instanceDivisor?: number;
}

/**
 * Single attribute layout within a buffer
 */
export interface AttributeLayout {
  /** Attribute name (matches shader) */
  name: string;
  /** Attribute location in shader */
  location: number;
  /** Number of components (1, 2, 3, or 4) */
  size: number;
  /** GL type (FLOAT, INT, etc.) */
  type: number;
  /** Whether values are normalized */
  normalized: boolean;
  /** Byte offset within stride */
  offset: number;
}

/**
 * Processed series data ready for GPU upload
 */
export interface ProcessedSeriesData {
  /** Interleaved position/attribute data */
  positions: Float32Array;
  /** Color data (if separate from positions) */
  colors: Float32Array;
  /** Size data (if separate from positions) */
  sizes?: Float32Array;
  /** Index buffer for indexed drawing */
  indices?: Uint32Array;
  /** Number of points in the series */
  pointCount: number;
  /** Calculated data bounds */
  bounds: DataDomain;
}
