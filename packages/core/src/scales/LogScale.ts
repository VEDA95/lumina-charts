/**
 * Logarithmic scale wrapper around D3's scaleLog
 */

import { scaleLog, type ScaleLogarithmic } from 'd3-scale';
import type { ContinuousScale, LogScaleConfig } from '../types/scale.js';

/**
 * Logarithmic scale for data spanning orders of magnitude
 * Note: Domain values must be > 0
 */
export class LogScale implements ContinuousScale {
  readonly type = 'log' as const;
  private d3Scale: ScaleLogarithmic<number, number>;
  private base: number;

  constructor(config?: LogScaleConfig) {
    this.base = config?.base ?? 10;
    this.d3Scale = scaleLog<number, number>().base(this.base).domain([1, 10]).range([0, 1]);

    if (config?.clamp) {
      this.d3Scale.clamp(true);
    }
  }

  domain(): [number, number];
  domain(d: [number, number]): this;
  domain(d?: [number, number]): [number, number] | this {
    if (d === undefined) {
      return this.d3Scale.domain() as [number, number];
    }
    // Validate domain values for log scale
    if (d[0] <= 0 || d[1] <= 0) {
      console.warn('LogScale: Domain values must be > 0. Using absolute values.');
      d = [Math.abs(d[0]) || 1, Math.abs(d[1]) || 10];
    }
    this.d3Scale.domain(d);
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

  scale(value: number): number {
    // Handle invalid values
    if (value <= 0) {
      return this.d3Scale.range()[0];
    }
    return this.d3Scale(value);
  }

  invert(value: number): number {
    return this.d3Scale.invert(value);
  }

  ticks(count?: number): number[] {
    return this.d3Scale.ticks(count);
  }

  tickFormat(count?: number, specifier?: string): (value: number) => string {
    return this.d3Scale.tickFormat(count, specifier);
  }

  isValidDomainValue(value: number): boolean {
    // Log scale only accepts positive values
    return Number.isFinite(value) && value > 0;
  }

  copy(): LogScale {
    const copied = new LogScale({ type: 'log', base: this.base });
    copied.d3Scale = this.d3Scale.copy();
    return copied;
  }

  nice(count?: number): this {
    this.d3Scale.nice(count);
    return this;
  }

  clamp(): boolean;
  clamp(clamp: boolean): this;
  clamp(clamp?: boolean): boolean | this {
    if (clamp === undefined) {
      return this.d3Scale.clamp();
    }
    this.d3Scale.clamp(clamp);
    return this;
  }

  /**
   * Get the log base
   */
  getBase(): number {
    return this.base;
  }

  /**
   * Set the log base
   */
  setBase(base: number): this {
    this.base = base;
    this.d3Scale.base(base);
    return this;
  }

  /**
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScaleLogarithmic<number, number> {
    return this.d3Scale;
  }
}
