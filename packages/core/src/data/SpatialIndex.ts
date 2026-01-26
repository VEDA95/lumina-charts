/**
 * Spatial index for efficient hit testing using R-tree
 */

import RBush from 'rbush';

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Indexed point with series and index information
 */
export interface IndexedPoint extends BoundingBox {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Series ID this point belongs to */
  seriesId: string;
  /** Index within the series */
  pointIndex: number;
}

/**
 * Hit test result
 */
export interface SpatialHitResult {
  /** The indexed point */
  point: IndexedPoint;
  /** Distance from query point */
  distance: number;
}

/**
 * R-tree based spatial index for efficient point queries
 * Enables O(log n) hit testing with millions of points
 */
export class SpatialIndex {
  private tree: RBush<IndexedPoint>;

  constructor(_pointRadius: number = 5) {
    this.tree = new RBush<IndexedPoint>();
  }

  /**
   * Build the spatial index from series data
   * Uses bulk loading for optimal performance
   */
  build(
    seriesData: Array<{
      id: string;
      data: Array<{ x: number; y: number }>;
    }>
  ): void {
    this.tree.clear();

    const items: IndexedPoint[] = [];

    for (const series of seriesData) {
      for (let i = 0; i < series.data.length; i++) {
        const point = series.data[i];
        items.push({
          x: point.x,
          y: point.y,
          seriesId: series.id,
          pointIndex: i,
          minX: point.x,
          minY: point.y,
          maxX: point.x,
          maxY: point.y,
        });
      }
    }

    // Bulk load is much faster than individual inserts
    this.tree.load(items);
  }

  /**
   * Build index from Float32Array data (more efficient for large datasets)
   */
  buildFromArrays(
    seriesData: Array<{
      id: string;
      data: Float32Array; // [x0, y0, x1, y1, ...]
      pointCount: number;
    }>
  ): void {
    this.tree.clear();

    const items: IndexedPoint[] = [];

    for (const series of seriesData) {
      const stride = 2;
      for (let i = 0; i < series.pointCount; i++) {
        const x = series.data[i * stride];
        const y = series.data[i * stride + 1];
        items.push({
          x,
          y,
          seriesId: series.id,
          pointIndex: i,
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
        });
      }
    }

    this.tree.load(items);
  }

  /**
   * Add points for a single series (incremental update)
   */
  addSeries(seriesId: string, data: Array<{ x: number; y: number }>): void {
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      this.tree.insert({
        x: point.x,
        y: point.y,
        seriesId,
        pointIndex: i,
        minX: point.x,
        minY: point.y,
        maxX: point.x,
        maxY: point.y,
      });
    }
  }

  /**
   * Remove all points for a series
   */
  removeSeries(seriesId: string): void {
    const all = this.tree.all();
    const toKeep = all.filter((p) => p.seriesId !== seriesId);

    this.tree.clear();
    this.tree.load(toKeep);
  }

  /**
   * Find the nearest point to the query coordinates
   * @param x - Query x coordinate
   * @param y - Query y coordinate
   * @param maxDistance - Maximum search distance
   * @param visibleSeries - Optional set of visible series IDs to filter by
   */
  findNearest(
    x: number,
    y: number,
    maxDistance: number,
    visibleSeries?: Set<string>
  ): SpatialHitResult | null {
    // Query a bounding box around the point
    const candidates = this.tree.search({
      minX: x - maxDistance,
      minY: y - maxDistance,
      maxX: x + maxDistance,
      maxY: y + maxDistance,
    });

    let nearest: IndexedPoint | null = null;
    let minDist = maxDistance;

    for (const candidate of candidates) {
      // Filter by visible series if provided
      if (visibleSeries && !visibleSeries.has(candidate.seriesId)) {
        continue;
      }

      const dist = Math.sqrt((candidate.x - x) ** 2 + (candidate.y - y) ** 2);

      if (dist < minDist) {
        minDist = dist;
        nearest = candidate;
      }
    }

    if (!nearest) {
      return null;
    }

    return { point: nearest, distance: minDist };
  }

  /**
   * Find all points within a rectangular region
   */
  findInRect(rect: BoundingBox, visibleSeries?: Set<string>): IndexedPoint[] {
    const candidates = this.tree.search(rect);

    if (!visibleSeries) {
      return candidates;
    }

    return candidates.filter((p) => visibleSeries.has(p.seriesId));
  }

  /**
   * Find all points within a polygon (lasso selection)
   */
  findInPolygon(polygon: Array<{ x: number; y: number }>, visibleSeries?: Set<string>): IndexedPoint[] {
    // First get bounding box candidates
    const bbox = this.calculatePolygonBBox(polygon);
    const candidates = this.tree.search(bbox);

    // Then filter by actual polygon containment
    const result: IndexedPoint[] = [];

    for (const candidate of candidates) {
      if (visibleSeries && !visibleSeries.has(candidate.seriesId)) {
        continue;
      }

      if (this.pointInPolygon(candidate, polygon)) {
        result.push(candidate);
      }
    }

    return result;
  }

  /**
   * Find K nearest neighbors
   */
  findKNearest(
    x: number,
    y: number,
    k: number,
    maxDistance: number = Infinity,
    visibleSeries?: Set<string>
  ): SpatialHitResult[] {
    // Start with a reasonable search radius and expand if needed
    let searchRadius = Math.min(maxDistance, 100);
    let candidates: IndexedPoint[] = [];

    while (searchRadius <= maxDistance) {
      candidates = this.tree.search({
        minX: x - searchRadius,
        minY: y - searchRadius,
        maxX: x + searchRadius,
        maxY: y + searchRadius,
      });

      if (visibleSeries) {
        candidates = candidates.filter((p) => visibleSeries.has(p.seriesId));
      }

      if (candidates.length >= k) break;
      searchRadius *= 2;
    }

    // Calculate distances and sort
    const withDistances: SpatialHitResult[] = candidates.map((point) => ({
      point,
      distance: Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2),
    }));

    withDistances.sort((a, b) => a.distance - b.distance);

    return withDistances.slice(0, k).filter((r) => r.distance <= maxDistance);
  }

  /**
   * Calculate bounding box of a polygon
   */
  private calculatePolygonBBox(polygon: Array<{ x: number; y: number }>): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of polygon) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Ray casting algorithm to check if point is inside polygon
   */
  private pointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get total number of indexed points
   */
  get size(): number {
    return this.tree.all().length;
  }

  /**
   * Clear all indexed points
   */
  clear(): void {
    this.tree.clear();
  }

  /**
   * Get all points (for debugging)
   */
  all(): IndexedPoint[] {
    return this.tree.all();
  }
}
