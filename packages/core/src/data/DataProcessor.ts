/**
 * Data processor for transforming series data into GPU-ready formats
 */

import type {
  DataPoint,
  Series,
  DataDomain,
  ProcessedSeriesData,
  RGBAColor,
} from '../types/index.js';

/**
 * Options for processing point data
 */
export interface ProcessPointOptions {
  /** Function to get color for each point */
  colorAccessor?: (point: DataPoint, index: number, series: Series) => RGBAColor;
  /** Function to get size for each point */
  sizeAccessor?: (point: DataPoint, index: number, series: Series) => number;
  /** Function to get shape for each point (0=circle, 1=square, 2=triangle, 3=diamond) */
  shapeAccessor?: (point: DataPoint, index: number, series: Series) => number;
  /** Default color if accessor not provided */
  defaultColor?: RGBAColor;
  /** Default size if accessor not provided */
  defaultSize?: number;
  /** Default shape if accessor not provided */
  defaultShape?: number;
}

/**
 * Options for processing line data
 */
export interface ProcessLineOptions {
  /** Line color */
  color?: RGBAColor;
  /** Line width in pixels */
  lineWidth?: number;
}

const DEFAULT_COLOR: RGBAColor = [0.4, 0.4, 0.8, 1.0];
const DEFAULT_SIZE = 5;
const DEFAULT_SHAPE = 0; // circle

/**
 * Process series data for GPU rendering
 */
export class DataProcessor {
  /**
   * Process scatter/point data into GPU-ready interleaved format
   * Output format: [x, y, r, g, b, a, size, shape, ...]
   */
  processPointData(series: Series, options: ProcessPointOptions = {}): ProcessedSeriesData {
    const { data } = series;
    const pointCount = data.length;

    const colorAccessor = options.colorAccessor ?? (() => options.defaultColor ?? DEFAULT_COLOR);
    const sizeAccessor = options.sizeAccessor ?? (() => options.defaultSize ?? DEFAULT_SIZE);
    const shapeAccessor = options.shapeAccessor ?? (() => options.defaultShape ?? DEFAULT_SHAPE);

    // Stride: x, y, r, g, b, a, size, shape = 8 floats
    const stride = 8;
    const buffer = new Float32Array(pointCount * stride);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < pointCount; i++) {
      const point = data[i];
      const offset = i * stride;
      const color = colorAccessor(point, i, series);
      const size = sizeAccessor(point, i, series);
      const shape = shapeAccessor(point, i, series);

      buffer[offset] = point.x;
      buffer[offset + 1] = point.y;
      buffer[offset + 2] = color[0];
      buffer[offset + 3] = color[1];
      buffer[offset + 4] = color[2];
      buffer[offset + 5] = color[3];
      buffer[offset + 6] = size;
      buffer[offset + 7] = shape;

      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return {
      positions: buffer,
      colors: new Float32Array(0), // Colors are interleaved
      pointCount,
      bounds: {
        x: [minX, maxX],
        y: [minY, maxY],
      },
    };
  }

  /**
   * Process line data into triangle strip format for thick anti-aliased lines
   * Each line segment becomes a quad (4 vertices, 6 indices)
   */
  processLineData(series: Series, options: ProcessLineOptions = {}): ProcessedSeriesData {
    const { data } = series;
    const color = options.color ?? DEFAULT_COLOR;
    const lineWidth = options.lineWidth ?? 2;

    if (data.length < 2) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        pointCount: 0,
        bounds: { x: [0, 0], y: [0, 0] },
      };
    }

    const segmentCount = data.length - 1;

    // Each segment: 4 vertices
    // Each vertex: currentPos(2) + nextPos(2) + direction(1) + color(4) + lineWidth(1) = 10 floats
    const stride = 10;
    const verticesPerSegment = 4;
    const buffer = new Float32Array(segmentCount * verticesPerSegment * stride);

    // Indices: 6 per segment (2 triangles)
    const indices = new Uint32Array(segmentCount * 6);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    let bufferIndex = 0;
    let indexIndex = 0;
    let vertexIndex = 0;

    for (let i = 0; i < segmentCount; i++) {
      const p1 = data[i];
      const p2 = data[i + 1];

      minX = Math.min(minX, p1.x, p2.x);
      maxX = Math.max(maxX, p1.x, p2.x);
      minY = Math.min(minY, p1.y, p2.y);
      maxY = Math.max(maxY, p1.y, p2.y);

      // Four vertices per segment: two at start, two at end
      // Directions: -1 for bottom, +1 for top
      const vertices: Array<[number, number, number, number, number]> = [
        [p1.x, p1.y, p2.x, p2.y, -1], // v0: start, bottom
        [p1.x, p1.y, p2.x, p2.y, 1], // v1: start, top
        [p2.x, p2.y, p2.x, p2.y, -1], // v2: end, bottom (nextPos same as current for end)
        [p2.x, p2.y, p2.x, p2.y, 1], // v3: end, top
      ];

      // Handle segment continuity - for end vertices, use next segment's direction
      if (i < segmentCount - 1) {
        const p3 = data[i + 2];
        vertices[2] = [p2.x, p2.y, p3.x, p3.y, -1];
        vertices[3] = [p2.x, p2.y, p3.x, p3.y, 1];
      }

      for (const [cx, cy, nx, ny, dir] of vertices) {
        buffer[bufferIndex++] = cx; // a_position.x
        buffer[bufferIndex++] = cy; // a_position.y
        buffer[bufferIndex++] = nx; // a_nextPosition.x
        buffer[bufferIndex++] = ny; // a_nextPosition.y
        buffer[bufferIndex++] = dir; // a_direction
        buffer[bufferIndex++] = color[0]; // r
        buffer[bufferIndex++] = color[1]; // g
        buffer[bufferIndex++] = color[2]; // b
        buffer[bufferIndex++] = color[3]; // a
        buffer[bufferIndex++] = lineWidth; // a_lineWidth
      }

      // Indices for two triangles (quad)
      // Triangle 1: v0, v1, v2
      // Triangle 2: v1, v3, v2
      const baseVertex = vertexIndex;
      indices[indexIndex++] = baseVertex;
      indices[indexIndex++] = baseVertex + 1;
      indices[indexIndex++] = baseVertex + 2;
      indices[indexIndex++] = baseVertex + 1;
      indices[indexIndex++] = baseVertex + 3;
      indices[indexIndex++] = baseVertex + 2;

      vertexIndex += 4;
    }

    return {
      positions: buffer,
      colors: new Float32Array(0),
      indices,
      pointCount: segmentCount * verticesPerSegment,
      bounds: {
        x: [minX, maxX],
        y: [minY, maxY],
      },
    };
  }

  /**
   * Process line data into simple format (for GL_LINES or GL_LINE_STRIP)
   * Output format: [x, y, r, g, b, a, ...]
   */
  processSimpleLineData(series: Series, color: RGBAColor = DEFAULT_COLOR): ProcessedSeriesData {
    const { data } = series;
    const pointCount = data.length;

    // Stride: x, y, r, g, b, a = 6 floats
    const stride = 6;
    const buffer = new Float32Array(pointCount * stride);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < pointCount; i++) {
      const point = data[i];
      const offset = i * stride;

      buffer[offset] = point.x;
      buffer[offset + 1] = point.y;
      buffer[offset + 2] = color[0];
      buffer[offset + 3] = color[1];
      buffer[offset + 4] = color[2];
      buffer[offset + 5] = color[3];

      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    return {
      positions: buffer,
      colors: new Float32Array(0),
      pointCount,
      bounds: {
        x: [minX, maxX],
        y: [minY, maxY],
      },
    };
  }

  /**
   * Process area fill data (line with fill to baseline)
   * Creates vertices for line points and corresponding baseline points
   */
  processAreaData(
    series: Series,
    baseline: number,
    fillColor: RGBAColor,
    _strokeColor?: RGBAColor
  ): ProcessedSeriesData {
    const { data } = series;

    if (data.length < 2) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        pointCount: 0,
        bounds: { x: [0, 0], y: [0, 0] },
      };
    }

    // Two vertices per data point (top and bottom)
    // Stride: x, y, normalizedY, r, g, b, a = 7 floats
    const stride = 7;
    const vertexCount = data.length * 2;
    const buffer = new Float32Array(vertexCount * stride);

    // Indices for triangle strip
    const indices = new Uint32Array((data.length - 1) * 6);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    let bufferIndex = 0;
    let indexIndex = 0;

    for (let i = 0; i < data.length; i++) {
      const point = data[i];

      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y, baseline);
      maxY = Math.max(maxY, point.y, baseline);

      // Top vertex (at data point)
      buffer[bufferIndex++] = point.x;
      buffer[bufferIndex++] = point.y;
      buffer[bufferIndex++] = 1.0; // normalizedY = 1 at top
      buffer[bufferIndex++] = fillColor[0];
      buffer[bufferIndex++] = fillColor[1];
      buffer[bufferIndex++] = fillColor[2];
      buffer[bufferIndex++] = fillColor[3];

      // Bottom vertex (at baseline)
      buffer[bufferIndex++] = point.x;
      buffer[bufferIndex++] = baseline;
      buffer[bufferIndex++] = 0.0; // normalizedY = 0 at bottom
      buffer[bufferIndex++] = fillColor[0];
      buffer[bufferIndex++] = fillColor[1];
      buffer[bufferIndex++] = fillColor[2];
      buffer[bufferIndex++] = fillColor[3] * 0.5; // Fade alpha at bottom

      // Indices for quad (two triangles)
      if (i < data.length - 1) {
        const topLeft = i * 2;
        const bottomLeft = i * 2 + 1;
        const topRight = (i + 1) * 2;
        const bottomRight = (i + 1) * 2 + 1;

        // Triangle 1: topLeft, bottomLeft, topRight
        indices[indexIndex++] = topLeft;
        indices[indexIndex++] = bottomLeft;
        indices[indexIndex++] = topRight;

        // Triangle 2: bottomLeft, bottomRight, topRight
        indices[indexIndex++] = bottomLeft;
        indices[indexIndex++] = bottomRight;
        indices[indexIndex++] = topRight;
      }
    }

    return {
      positions: buffer,
      colors: new Float32Array(0),
      indices,
      pointCount: vertexCount,
      bounds: {
        x: [minX, maxX],
        y: [minY, maxY],
      },
    };
  }

  /**
   * Extract just x,y coordinates as Float32Array
   * Useful for LOD generation
   */
  extractCoordinates(series: Series): { data: Float32Array; pointCount: number } {
    const { data } = series;
    const result = new Float32Array(data.length * 2);

    for (let i = 0; i < data.length; i++) {
      result[i * 2] = data[i].x;
      result[i * 2 + 1] = data[i].y;
    }

    return { data: result, pointCount: data.length };
  }

  /**
   * Options for calculating bounds
   */
  static readonly DEFAULT_PADDING = { x: 0.05, y: 0.05 };

  /**
   * Calculate data bounds for multiple series
   * @param seriesArray Array of series to calculate bounds for
   * @param visibleOnly Only include visible series (default: true)
   * @param padding Padding as fraction of range { x: 0.05, y: 0.05 } or false for no padding
   */
  calculateBounds(
    seriesArray: Series[],
    visibleOnly: boolean = true,
    padding: { x: number; y: number } | false = DataProcessor.DEFAULT_PADDING
  ): DataDomain {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const series of seriesArray) {
      if (visibleOnly && series.visible === false) continue;

      for (const point of series.data) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }

    // Handle empty data
    if (!Number.isFinite(minX)) {
      return { x: [0, 1], y: [0, 1] };
    }

    // Add padding if specified
    if (padding !== false) {
      const xRange = maxX - minX || 1;
      const yRange = maxY - minY || 1;
      const xPadding = xRange * padding.x;
      const yPadding = yRange * padding.y;

      return {
        x: [minX - xPadding, maxX + xPadding],
        y: [minY - yPadding, maxY + yPadding],
      };
    }

    return {
      x: [minX, maxX],
      y: [minY, maxY],
    };
  }
}
