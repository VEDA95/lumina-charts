/**
 * Band scale wrapper around D3's scaleBand
 */

import { scaleBand, type ScaleBand } from 'd3-scale';
import type { BandScale as BandScaleInterface, BandScaleConfig } from '../types/scale.js';

/**
 * Band scale for categorical/discrete axes
 * Maps string categories to evenly-spaced bands
 */
export class BandScale implements BandScaleInterface {
  readonly type = 'band' as const;
  private d3Scale: ScaleBand<string>;
  private categories: string[];

  constructor(config?: BandScaleConfig) {
    this.categories = [];
    this.d3Scale = scaleBand<string>().domain([]).range([0, 1]);

    // Apply padding configuration
    if (config?.padding !== undefined) {
      this.d3Scale.padding(config.padding);
    } else {
      // Default padding
      this.d3Scale.padding(0.1);
    }

    if (config?.paddingInner !== undefined) {
      this.d3Scale.paddingInner(config.paddingInner);
    }

    if (config?.paddingOuter !== undefined) {
      this.d3Scale.paddingOuter(config.paddingOuter);
    }

    if (config?.align !== undefined) {
      this.d3Scale.align(config.align);
    }
  }

  domain(): string[];
  domain(d: string[]): this;
  domain(d?: string[] | [string, string]): string[] | this {
    if (d === undefined) {
      return this.d3Scale.domain();
    }
    this.categories = Array.isArray(d) ? d : [d[0], d[1]];
    this.d3Scale.domain(this.categories);
    return this;
  }

  range(): [number, number];
  range(r: [number, number]): this;
  range(r?: [number, number]): [number, number] | this {
    if (r === undefined) {
      return this.d3Scale.range() as [number, number];
    }
    this.d3Scale.range(r);
    return this;
  }

  scale(value: string): number {
    const result = this.d3Scale(value);
    // Return center of band by default
    return result !== undefined ? result + this.bandwidth() / 2 : 0;
  }

  /**
   * Get the start position of a band (left edge)
   */
  bandStart(value: string): number {
    return this.d3Scale(value) ?? 0;
  }

  /**
   * Get the center position of a band
   */
  bandCenter(value: string): number {
    const start = this.d3Scale(value);
    return start !== undefined ? start + this.bandwidth() / 2 : 0;
  }

  invert(value: number): string {
    // Find the category whose band contains this value
    const [rangeMin] = this.range();
    const step = this.step();

    if (step === 0 || this.categories.length === 0) {
      return this.categories[0] ?? '';
    }

    // Calculate which band index this value falls into
    const normalizedValue = value - rangeMin;
    const index = Math.floor(normalizedValue / step);
    const clampedIndex = Math.max(0, Math.min(this.categories.length - 1, index));

    return this.categories[clampedIndex] ?? '';
  }

  ticks(_count?: number): string[] {
    // For band scales, ticks are just the categories
    return this.categories;
  }

  tickFormat(_count?: number, _specifier?: string): (value: string) => string {
    // Band scales just return the category name
    return (value: string) => value;
  }

  isValidDomainValue(value: string): boolean {
    return typeof value === 'string';
  }

  copy(): BandScale {
    const copied = new BandScale();
    copied.d3Scale = this.d3Scale.copy();
    copied.categories = [...this.categories];
    return copied;
  }

  nice(_count?: number): this {
    // Band scales don't support nice()
    return this;
  }

  clamp(): boolean;
  clamp(_clamp: boolean): this;
  clamp(_clamp?: boolean): boolean | this {
    // Band scales don't support clamp
    if (_clamp === undefined) {
      return false;
    }
    return this;
  }

  /**
   * Get the width of each band
   */
  bandwidth(): number {
    return this.d3Scale.bandwidth();
  }

  /**
   * Get the step size (band width + padding)
   */
  step(): number {
    return this.d3Scale.step();
  }

  paddingInner(): number;
  paddingInner(padding: number): this;
  paddingInner(padding?: number): number | this {
    if (padding === undefined) {
      return this.d3Scale.paddingInner();
    }
    this.d3Scale.paddingInner(padding);
    return this;
  }

  paddingOuter(): number;
  paddingOuter(padding: number): this;
  paddingOuter(padding?: number): number | this {
    if (padding === undefined) {
      return this.d3Scale.paddingOuter();
    }
    this.d3Scale.paddingOuter(padding);
    return this;
  }

  align(): number;
  align(align: number): this;
  align(align?: number): number | this {
    if (align === undefined) {
      return this.d3Scale.align();
    }
    this.d3Scale.align(align);
    return this;
  }

  /**
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScaleBand<string> {
    return this.d3Scale;
  }

  /**
   * Get the list of categories
   */
  getCategories(): string[] {
    return [...this.categories];
  }

  /**
   * Get category index
   */
  getCategoryIndex(category: string): number {
    return this.categories.indexOf(category);
  }
}
