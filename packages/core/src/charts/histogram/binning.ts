/**
 * Binning algorithms for histogram data
 */

import { arrayMin, arrayMax } from '../../utils/math.js';

/**
 * Binning configuration
 */
export interface BinConfig {
  /** Binning method: 'count' for fixed number of bins, 'width' for fixed bin width */
  method: 'count' | 'width';
  /** Number of bins (if method='count') or bin width (if method='width') */
  value: number;
  /** Optional minimum value for domain (auto-calculated from data if not provided) */
  min?: number;
  /** Optional maximum value for domain (auto-calculated from data if not provided) */
  max?: number;
}

/**
 * A single histogram bin
 */
export interface Bin {
  /** Left edge of bin (inclusive) */
  x0: number;
  /** Right edge of bin (exclusive, except for last bin) */
  x1: number;
  /** Number of values in this bin */
  count: number;
  /** Original values that fall in this bin (useful for tooltips) */
  values: number[];
}

/**
 * Result of binning operation
 */
export interface BinResult {
  /** Array of bins */
  bins: Bin[];
  /** Minimum value in domain */
  min: number;
  /** Maximum value in domain */
  max: number;
  /** Width of each bin */
  binWidth: number;
}

/**
 * Bin continuous data into discrete bins
 *
 * @param values - Array of numeric values to bin
 * @param config - Binning configuration
 * @returns BinResult with bins and metadata
 */
export function binData(values: number[], config: BinConfig): BinResult {
  if (values.length === 0) {
    return {
      bins: [],
      min: 0,
      max: 0,
      binWidth: 0,
    };
  }

  // Calculate domain from data or config
  let min = config.min ?? arrayMin(values);
  let max = config.max ?? arrayMax(values);

  // Ensure we have a valid range
  if (min === max) {
    min = min - 0.5;
    max = max + 0.5;
  }

  // Calculate bin width and count based on method
  let binCount: number;
  let binWidth: number;

  if (config.method === 'count') {
    binCount = Math.max(1, Math.floor(config.value));
    binWidth = (max - min) / binCount;
  } else {
    // method === 'width'
    binWidth = config.value;
    binCount = Math.ceil((max - min) / binWidth);
    // Adjust max to fit exact number of bins
    max = min + binCount * binWidth;
  }

  // Create empty bins
  const bins: Bin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0,
      values: [],
    });
  }

  // Assign values to bins
  for (const value of values) {
    // Find the bin index for this value
    let binIndex = Math.floor((value - min) / binWidth);

    // Handle edge case: value exactly equals max goes in last bin
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    // Handle edge case: value below min (shouldn't happen with auto domain)
    if (binIndex < 0) {
      binIndex = 0;
    }

    bins[binIndex].count++;
    bins[binIndex].values.push(value);
  }

  return {
    bins,
    min,
    max,
    binWidth,
  };
}

/**
 * Calculate optimal bin count using Sturges' rule
 * Good for normally distributed data
 *
 * @param n - Number of data points
 * @returns Suggested number of bins
 */
export function sturgesBinCount(n: number): number {
  return Math.ceil(Math.log2(n) + 1);
}

/**
 * Calculate optimal bin count using Scott's rule
 * Better for larger datasets
 *
 * @param values - Array of values
 * @returns Suggested number of bins
 */
export function scottBinCount(values: number[]): number {
  if (values.length < 2) return 1;

  const n = values.length;
  const std = standardDeviation(values);
  const range = arrayMax(values) - arrayMin(values);

  if (std === 0 || range === 0) return 1;

  const binWidth = 3.5 * std * Math.pow(n, -1 / 3);
  return Math.ceil(range / binWidth);
}

/**
 * Calculate optimal bin count using Freedman-Diaconis rule
 * Robust to outliers
 *
 * @param values - Array of values
 * @returns Suggested number of bins
 */
export function freedmanDiaconisBinCount(values: number[]): number {
  if (values.length < 4) return sturgesBinCount(values.length);

  const n = values.length;
  const iqr = interquartileRange(values);
  const range = arrayMax(values) - arrayMin(values);

  if (iqr === 0 || range === 0) return sturgesBinCount(n);

  const binWidth = 2 * iqr * Math.pow(n, -1 / 3);
  return Math.ceil(range / binWidth);
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
 * Calculate interquartile range (Q3 - Q1)
 */
function interquartileRange(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  return sorted[q3Index] - sorted[q1Index];
}
