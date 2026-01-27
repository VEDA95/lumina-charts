/**
 * Power scale wrapper around D3's scalePow and scaleSqrt
 */

import { scalePow, scaleSqrt, type ScalePower } from 'd3-scale';
import type { ContinuousScale, PowScaleConfig, SqrtScaleConfig } from '../types/scale.js';

/**
 * Power scale for scientific data and area-based measurements
 * Use exponent=0.5 for square root scale
 */
export class PowScale implements ContinuousScale {
  readonly type: 'pow' | 'sqrt';
  private d3Scale: ScalePower<number, number>;
  private exponent: number;

  constructor(config?: PowScaleConfig | SqrtScaleConfig) {
    if (config?.type === 'sqrt') {
      this.type = 'sqrt';
      this.exponent = 0.5;
      this.d3Scale = scaleSqrt<number, number>().domain([0, 1]).range([0, 1]);
    } else {
      this.type = 'pow';
      this.exponent = (config as PowScaleConfig)?.exponent ?? 2;
      this.d3Scale = scalePow<number, number>()
        .exponent(this.exponent)
        .domain([0, 1])
        .range([0, 1]);
    }

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

  isValidDomainValue(value: number): boolean {
    // For sqrt (exponent 0.5), negative values are invalid
    if (this.exponent < 1 && this.exponent > 0 && value < 0) {
      return false;
    }
    return Number.isFinite(value);
  }

  copy(): PowScale {
    const copied = new PowScale({
      type: this.type as 'pow',
      exponent: this.exponent,
    });
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
   * Get the exponent
   */
  getExponent(): number {
    return this.exponent;
  }

  /**
   * Set the exponent
   */
  setExponent(exponent: number): this {
    this.exponent = exponent;
    this.d3Scale.exponent(exponent);
    return this;
  }

  /**
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScalePower<number, number> {
    return this.d3Scale;
  }
}
