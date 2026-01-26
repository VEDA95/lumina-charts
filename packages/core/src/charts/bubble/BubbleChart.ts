/**
 * Bubble chart implementation
 * Extends ScatterChart to add z-value → size mapping
 */

import type {
  Series,
  DataPoint,
  BubbleDataPoint,
  RGBAColor,
} from '../../types/index.js';
import { ScatterChart, type ScatterChartOptions, type ScatterChartConfig } from '../scatter/ScatterChart.js';

/**
 * Configuration for bubble sizing
 */
export interface BubbleSizeConfig {
  /** Minimum bubble size in pixels (default: 4) */
  minSize?: number;
  /** Maximum bubble size in pixels (default: 40) */
  maxSize?: number;
  /** Scale type for z-to-size mapping (default: 'sqrt') */
  scale?: 'linear' | 'sqrt' | 'log';
  /** Fixed z-domain [min, max]. Auto-calculated from data if not provided */
  domain?: [number, number];
}

/**
 * Bubble chart specific options
 */
export interface BubbleChartOptions extends Omit<ScatterChartOptions, 'pointSize'> {
  /** Configuration for bubble sizing */
  bubbleSize?: BubbleSizeConfig;
  /** Bubble opacity (0-1, default: 0.7 for semi-transparency) */
  bubbleOpacity?: number;
}

/**
 * Bubble chart configuration
 */
export interface BubbleChartConfig {
  /** Container element for the chart */
  container: HTMLElement;
  /** Chart options */
  options?: BubbleChartOptions;
}

/**
 * Default colors for bubble series (with alpha for semi-transparency)
 */
const DEFAULT_BUBBLE_COLORS: RGBAColor[] = [
  [0.4, 0.4, 0.8, 0.7], // Blue
  [0.8, 0.4, 0.4, 0.7], // Red
  [0.4, 0.8, 0.4, 0.7], // Green
  [0.8, 0.6, 0.2, 0.7], // Orange
  [0.6, 0.4, 0.8, 0.7], // Purple
];

/**
 * Bubble chart for visualizing 3-dimensional data (x, y, size)
 * Each point's size represents a third variable (z-value)
 */
export class BubbleChart extends ScatterChart {
  private bubbleSizeConfig: BubbleSizeConfig;
  private zDomain: [number, number] = [0, 1];

  constructor(config: BubbleChartConfig) {
    const bubbleConfig = config.options?.bubbleSize ?? {};
    const opacity = config.options?.bubbleOpacity ?? 0.7;

    // Create ScatterChart config with our size accessor and semi-transparent colors
    const scatterConfig: ScatterChartConfig = {
      container: config.container,
      options: {
        ...config.options,
        // Override pointSize with our z-value mapper
        pointSize: (point: DataPoint) => this.getPointSize(point),
        // Override pointColor with semi-transparent default
        pointColor: config.options?.pointColor ?? ((_point: DataPoint, _index: number, _series: Series) => {
          // Use series index to pick color, apply opacity
          const baseColor = DEFAULT_BUBBLE_COLORS[0];
          return [baseColor[0], baseColor[1], baseColor[2], opacity] as RGBAColor;
        }),
      },
    };

    super(scatterConfig);

    this.bubbleSizeConfig = {
      minSize: 4,
      maxSize: 40,
      scale: 'sqrt',
      ...bubbleConfig,
    };
  }

  /**
   * Calculate point size from z-value
   */
  private getPointSize(point: DataPoint): number {
    const z = (point as BubbleDataPoint).z ?? 0;
    const { minSize = 4, maxSize = 40, scale = 'sqrt' } = this.bubbleSizeConfig;

    const [zMin, zMax] = this.zDomain;
    const range = zMax - zMin || 1;

    // Normalize z to 0-1
    let normalized = (z - zMin) / range;
    normalized = Math.max(0, Math.min(1, normalized));

    // Apply scale function
    switch (scale) {
      case 'sqrt':
        // Area proportional to value (most common for bubble charts)
        normalized = Math.sqrt(normalized);
        break;
      case 'log':
        // Logarithmic scale for wide value ranges
        normalized = Math.log1p(normalized * 9) / Math.log(10);
        break;
      // 'linear' - no transformation
    }

    return minSize + normalized * (maxSize - minSize);
  }

  /**
   * Calculate z-domain from data
   */
  private calculateZDomain(series: Series[]): [number, number] {
    // Use config domain if provided
    if (this.bubbleSizeConfig.domain) {
      return this.bubbleSizeConfig.domain;
    }

    let zMin = Infinity;
    let zMax = -Infinity;

    for (const s of series) {
      for (const point of s.data) {
        const z = (point as BubbleDataPoint).z;
        if (z !== undefined && !isNaN(z)) {
          zMin = Math.min(zMin, z);
          zMax = Math.max(zMax, z);
        }
      }
    }

    // Handle edge cases
    if (zMin === Infinity) zMin = 0;
    if (zMax === -Infinity) zMax = 1;
    if (zMin === zMax) {
      // All values are the same, create a small range
      zMin = zMin - 0.5;
      zMax = zMax + 0.5;
    }

    return [zMin, zMax];
  }

  /**
   * Override to calculate z-domain before processing
   */
  protected onDataUpdate(series: Series[]): void {
    // Calculate z-domain from data before processing
    this.zDomain = this.calculateZDomain(series);

    // Call parent to process and render
    super.onDataUpdate(series);
  }

  /**
   * Update bubble size configuration
   */
  setBubbleSize(config: Partial<BubbleSizeConfig>): void {
    Object.assign(this.bubbleSizeConfig, config);

    // Recalculate domain if it was cleared
    if (config.domain === undefined && this.series.length > 0) {
      this.zDomain = this.calculateZDomain(this.series);
    } else if (config.domain) {
      this.zDomain = config.domain;
    }

    // Re-process data with new size config
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }

    // Render with new settings
    this.render();
  }

  /**
   * Get current bubble size configuration
   */
  getBubbleSizeConfig(): BubbleSizeConfig {
    return { ...this.bubbleSizeConfig };
  }

  /**
   * Get the current z-domain
   */
  getZDomain(): [number, number] {
    return [...this.zDomain] as [number, number];
  }
}
