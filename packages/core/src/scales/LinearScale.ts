/**
 * Linear scale wrapper around D3's scaleLinear
 */

import { scaleLinear, type ScaleLinear } from 'd3-scale';
import type { ContinuousScale, LinearScaleConfig } from '../types/scale.js';

/**
 * Linear scale - default scale for numeric axes
 * Maps domain values linearly to range values
 */
export class LinearScale implements ContinuousScale {
  readonly type = 'linear' as const;
  private d3Scale: ScaleLinear<number, number>;

  constructor(config?: LinearScaleConfig) {
    this.d3Scale = scaleLinear<number, number>().domain([0, 1]).range([0, 1]);

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

  isValidDomainValue(_value: number): boolean {
    // Linear scale accepts all finite numbers
    return Number.isFinite(_value);
  }

  copy(): LinearScale {
    const copied = new LinearScale();
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
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScaleLinear<number, number> {
    return this.d3Scale;
  }
}
