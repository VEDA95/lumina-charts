/**
 * Statistical calculations for histogram overlays
 */

import type { Bin } from './binning.js';
import { arrayMin, arrayMax } from '../../utils/math.js';

/**
 * Configuration for Kernel Density Estimation
 */
export interface KDEConfig {
  /** Bandwidth (smoothing parameter). Auto-calculated using Silverman's rule if not provided */
  bandwidth?: number;
  /** Kernel function to use */
  kernel?: 'gaussian' | 'epanechnikov';
  /** Number of points to evaluate (default: 100) */
  points?: number;
  /** Minimum x value for evaluation (auto from data if not provided) */
  min?: number;
  /** Maximum x value for evaluation (auto from data if not provided) */
  max?: number;
}

/**
 * Point on a curve
 */
export interface CurvePoint {
  x: number;
  y: number;
}

/**
 * Calculate Kernel Density Estimation
 *
 * @param values - Array of data values
 * @param config - KDE configuration
 * @returns Array of points representing the density curve
 */
export function calculateKDE(values: number[], config: KDEConfig = {}): CurvePoint[] {
  if (values.length === 0) return [];

  const { kernel = 'gaussian', points = 100 } = config;

  // Calculate domain
  const dataMin = arrayMin(values);
  const dataMax = arrayMax(values);
  const range = dataMax - dataMin || 1;

  // Extend domain slightly beyond data range for smoother edges
  const padding = range * 0.1;
  const min = config.min ?? dataMin - padding;
  const max = config.max ?? dataMax + padding;

  // Calculate bandwidth using Silverman's rule if not provided
  const bandwidth = config.bandwidth ?? silvermanBandwidth(values);

  // Select kernel function
  const kernelFn = kernel === 'gaussian' ? gaussianKernel : epanechnikovKernel;

  // Generate evaluation points
  const step = (max - min) / (points - 1);
  const result: CurvePoint[] = [];

  for (let i = 0; i < points; i++) {
    const x = min + i * step;

    // Calculate density at this point
    let density = 0;
    for (const xi of values) {
      const u = (x - xi) / bandwidth;
      density += kernelFn(u);
    }
    density /= values.length * bandwidth;

    result.push({ x, y: density });
  }

  return result;
}

/**
 * Scale KDE curve to match histogram scale
 * (converts probability density to frequency that matches bin heights)
 *
 * @param kdePoints - Points from calculateKDE
 * @param totalCount - Total number of data points
 * @param binWidth - Width of histogram bins
 * @returns Scaled curve points
 */
export function scaleKDEToHistogram(
  kdePoints: CurvePoint[],
  totalCount: number,
  binWidth: number
): CurvePoint[] {
  // Scale factor: density * n * binWidth = expected frequency
  const scaleFactor = totalCount * binWidth;

  return kdePoints.map((point) => ({
    x: point.x,
    y: point.y * scaleFactor,
  }));
}

/**
 * Calculate cumulative distribution from bins
 *
 * @param bins - Histogram bins
 * @param normalize - If true, normalize to 0-1 range (percentage)
 * @returns Array of points for step line
 */
export function calculateCumulative(bins: Bin[], normalize: boolean = true): CurvePoint[] {
  if (bins.length === 0) return [];

  const points: CurvePoint[] = [];
  let cumulative = 0;

  // Total count for normalization
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
  const scale = normalize && totalCount > 0 ? 1 / totalCount : 1;

  // Start at 0
  points.push({ x: bins[0].x0, y: 0 });

  // Add cumulative values at each bin edge
  for (const bin of bins) {
    cumulative += bin.count;
    const y = cumulative * scale;

    // Step at left edge (horizontal line to this point)
    points.push({ x: bin.x0, y: points[points.length - 1].y });
    // Step up at right edge
    points.push({ x: bin.x1, y });
  }

  return points;
}

/**
 * Calculate cumulative distribution from raw values (empirical CDF)
 *
 * @param values - Array of data values
 * @param points - Number of evaluation points (default: 100)
 * @returns Array of points for the CDF curve
 */
export function calculateEmpiricalCDF(values: number[], points: number = 100): CurvePoint[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min || 1;

  // Extend domain slightly
  const padding = range * 0.05;
  const xMin = min - padding;
  const xMax = max + padding;
  const step = (xMax - xMin) / (points - 1);

  const result: CurvePoint[] = [];

  for (let i = 0; i < points; i++) {
    const x = xMin + i * step;

    // Count values <= x
    let count = 0;
    for (const v of sorted) {
      if (v <= x) count++;
      else break; // sorted, so we can stop early
    }

    result.push({ x, y: count / n });
  }

  return result;
}

/**
 * Silverman's rule of thumb for bandwidth selection
 */
function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 1;

  const std = standardDeviation(values);
  const iqr = interquartileRange(values);

  // Silverman's rule: h = 0.9 * min(σ, IQR/1.34) * n^(-1/5)
  const spread = Math.min(std, iqr / 1.34);

  // Fallback if both are 0
  if (spread === 0) {
    const range = arrayMax(values) - arrayMin(values);
    return range / 10 || 1;
  }

  return 0.9 * spread * Math.pow(n, -0.2);
}

/**
 * Gaussian kernel function
 */
function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}

/**
 * Epanechnikov kernel function (more efficient, finite support)
 */
function epanechnikovKernel(u: number): number {
  if (Math.abs(u) > 1) return 0;
  return 0.75 * (1 - u * u);
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate interquartile range
 */
function interquartileRange(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (n < 4) return sorted[n - 1] - sorted[0];

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  return sorted[q3Index] - sorted[q1Index];
}
