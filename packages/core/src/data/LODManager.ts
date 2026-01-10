/**
 * Level of Detail (LOD) manager for handling large datasets
 * Uses LTTB (Largest Triangle Three Buckets) algorithm for visual-preserving decimation
 */

/**
 * A single LOD level with decimated data
 */
export interface LODLevel {
  /** Level index (0 = full resolution) */
  level: number;
  /** Decimated data as Float32Array [x0, y0, x1, y1, ...] */
  data: Float32Array;
  /** Number of points in this level */
  pointCount: number;
  /** Points-per-pixel threshold for selecting this level */
  threshold: number;
}

/**
 * LOD configuration options
 */
export interface LODConfig {
  /** Target point counts for each LOD level */
  targetLevels?: number[];
  /** Minimum points before generating LOD */
  minPointsForLOD?: number;
  /** Whether to use web workers for decimation */
  useWorkers?: boolean;
}

const DEFAULT_TARGET_LEVELS = [500000, 100000, 50000, 10000, 2000, 500];
const DEFAULT_MIN_POINTS = 10000;

/**
 * Manages LOD levels for series data
 */
export class LODManager {
  private levels: Map<string, LODLevel[]> = new Map();
  private config: Required<LODConfig>;

  constructor(config: LODConfig = {}) {
    this.config = {
      targetLevels: config.targetLevels ?? DEFAULT_TARGET_LEVELS,
      minPointsForLOD: config.minPointsForLOD ?? DEFAULT_MIN_POINTS,
      useWorkers: config.useWorkers ?? false,
    };
  }

  /**
   * Generate LOD levels for a series
   * @param seriesId - Unique identifier for the series
   * @param data - Float32Array of [x, y] pairs
   * @param pointCount - Number of points in the data
   * @returns Array of LOD levels
   */
  generateLODLevels(seriesId: string, data: Float32Array, pointCount: number): LODLevel[] {
    const levels: LODLevel[] = [];

    // Level 0: Full resolution
    levels.push({
      level: 0,
      data,
      pointCount,
      threshold: 0,
    });

    // Skip LOD generation for small datasets
    if (pointCount < this.config.minPointsForLOD) {
      this.levels.set(seriesId, levels);
      return levels;
    }

    // Generate progressively decimated levels
    let currentData = data;
    let currentCount = pointCount;

    for (let i = 0; i < this.config.targetLevels.length; i++) {
      const targetCount = this.config.targetLevels[i];

      if (currentCount <= targetCount) {
        continue;
      }

      const decimated = this.lttbDecimate(currentData, currentCount, targetCount);

      levels.push({
        level: i + 1,
        data: decimated.data,
        pointCount: decimated.count,
        threshold: currentCount / targetCount,
      });

      currentData = decimated.data;
      currentCount = decimated.count;
    }

    this.levels.set(seriesId, levels);
    return levels;
  }

  /**
   * LTTB (Largest Triangle Three Buckets) decimation algorithm
   * Preserves visual appearance while reducing point count
   * Time complexity: O(n)
   */
  private lttbDecimate(
    data: Float32Array,
    sourceCount: number,
    targetCount: number
  ): { data: Float32Array; count: number } {
    if (sourceCount <= targetCount) {
      return { data, count: sourceCount };
    }

    const stride = 2; // x, y per point
    const result = new Float32Array(targetCount * stride);

    // Always include first point
    result[0] = data[0];
    result[1] = data[1];

    const bucketSize = (sourceCount - 2) / (targetCount - 2);
    let resultIndex = stride;
    let prevSelectedIndex = 0;

    for (let bucketIdx = 0; bucketIdx < targetCount - 2; bucketIdx++) {
      // Calculate bucket boundaries
      const bucketStart = Math.floor((bucketIdx + 1) * bucketSize) + 1;
      const bucketEnd = Math.min(Math.floor((bucketIdx + 2) * bucketSize) + 1, sourceCount - 1);

      // Calculate average point of next bucket (for triangle area calculation)
      const nextBucketStart = bucketEnd;
      const nextBucketEnd = Math.min(Math.floor((bucketIdx + 3) * bucketSize) + 1, sourceCount);
      const nextBucketSize = nextBucketEnd - nextBucketStart;

      let avgX = 0;
      let avgY = 0;

      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += data[j * stride];
        avgY += data[j * stride + 1];
      }
      avgX /= nextBucketSize;
      avgY /= nextBucketSize;

      // Find the point in current bucket with largest triangle area
      let maxArea = -1;
      let selectedIndex = bucketStart;

      const prevX = data[prevSelectedIndex * stride];
      const prevY = data[prevSelectedIndex * stride + 1];

      for (let j = bucketStart; j < bucketEnd; j++) {
        const currX = data[j * stride];
        const currY = data[j * stride + 1];

        // Triangle area using cross product (absolute value)
        const area = Math.abs((prevX - avgX) * (currY - prevY) - (prevX - currX) * (avgY - prevY));

        if (area > maxArea) {
          maxArea = area;
          selectedIndex = j;
        }
      }

      // Add selected point to result
      result[resultIndex] = data[selectedIndex * stride];
      result[resultIndex + 1] = data[selectedIndex * stride + 1];
      resultIndex += stride;
      prevSelectedIndex = selectedIndex;
    }

    // Always include last point
    result[resultIndex] = data[(sourceCount - 1) * stride];
    result[resultIndex + 1] = data[(sourceCount - 1) * stride + 1];

    return { data: result, count: targetCount };
  }

  /**
   * Select the appropriate LOD level based on current viewport
   * @param seriesId - Series identifier
   * @param viewportWidth - Width of viewport in pixels
   * @param visibleXRange - Visible x-axis range [min, max]
   * @param fullXRange - Full data x-axis range [min, max]
   */
  selectLODLevel(
    seriesId: string,
    viewportWidth: number,
    visibleXRange: [number, number],
    fullXRange: [number, number]
  ): LODLevel {
    const levels = this.levels.get(seriesId);

    if (!levels || levels.length === 0) {
      throw new Error(`No LOD levels for series "${seriesId}"`);
    }

    // Calculate how many points would be visible per pixel
    const visibleRatio = (visibleXRange[1] - visibleXRange[0]) / (fullXRange[1] - fullXRange[0]);
    const visiblePoints = levels[0].pointCount * visibleRatio;
    const pointsPerPixel = visiblePoints / viewportWidth;

    // Select the highest quality level where pointsPerPixel is below threshold
    // Start from lowest quality (highest index) and work up
    for (let i = levels.length - 1; i >= 0; i--) {
      const level = levels[i];

      // If we're at the lowest quality or points per pixel exceeds threshold
      if (i === levels.length - 1 || pointsPerPixel >= level.threshold) {
        return level;
      }
    }

    // Default to full resolution
    return levels[0];
  }

  /**
   * Get all LOD levels for a series
   */
  getLevels(seriesId: string): LODLevel[] | undefined {
    return this.levels.get(seriesId);
  }

  /**
   * Check if LOD levels exist for a series
   */
  hasLevels(seriesId: string): boolean {
    return this.levels.has(seriesId);
  }

  /**
   * Remove LOD levels for a series
   */
  removeLevels(seriesId: string): void {
    this.levels.delete(seriesId);
  }

  /**
   * Clear all LOD levels
   */
  clear(): void {
    this.levels.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { seriesCount: number; totalBytes: number; levelCounts: number[] } {
    let totalBytes = 0;
    const levelCounts: number[] = [];

    for (const levels of this.levels.values()) {
      for (const level of levels) {
        totalBytes += level.data.byteLength;
        levelCounts[level.level] = (levelCounts[level.level] || 0) + 1;
      }
    }

    return {
      seriesCount: this.levels.size,
      totalBytes,
      levelCounts,
    };
  }
}

/**
 * Douglas-Peucker decimation algorithm (alternative to LTTB)
 * Better for polyline simplification, but O(n log n) complexity
 */
export function douglasPeuckerDecimate(
  data: Float32Array,
  pointCount: number,
  epsilon: number
): { data: Float32Array; count: number } {
  if (pointCount < 3) {
    return { data, count: pointCount };
  }

  const stride = 2;
  const keep = new Uint8Array(pointCount);
  keep[0] = 1;
  keep[pointCount - 1] = 1;

  // Stack-based implementation to avoid recursion
  const stack: Array<[number, number]> = [[0, pointCount - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;

    if (end - start < 2) continue;

    // Find point with maximum distance from line
    let maxDist = 0;
    let maxIndex = start;

    const x1 = data[start * stride];
    const y1 = data[start * stride + 1];
    const x2 = data[end * stride];
    const y2 = data[end * stride + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    for (let i = start + 1; i < end; i++) {
      const px = data[i * stride];
      const py = data[i * stride + 1];

      let dist: number;

      if (lenSq === 0) {
        dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      } else {
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      }

      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex]);
      stack.push([maxIndex, end]);
    }
  }

  // Count kept points
  let keptCount = 0;
  for (let i = 0; i < pointCount; i++) {
    if (keep[i]) keptCount++;
  }

  // Build result
  const result = new Float32Array(keptCount * stride);
  let resultIndex = 0;

  for (let i = 0; i < pointCount; i++) {
    if (keep[i]) {
      result[resultIndex++] = data[i * stride];
      result[resultIndex++] = data[i * stride + 1];
    }
  }

  return { data: result, count: keptCount };
}
