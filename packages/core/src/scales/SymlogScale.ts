/**
 * Symmetric log scale wrapper around D3's scaleSymlog
 */

import { scaleSymlog, type ScaleSymLog } from 'd3-scale';
import type { ContinuousScale, SymlogScaleConfig } from '../types/scale.js';

/**
 * Symmetric log scale that handles zero and negative values
 * Uses a linear region around zero defined by the constant parameter
 */
export class SymlogScale implements ContinuousScale {
  readonly type = 'symlog' as const;
  private d3Scale: ScaleSymLog<number, number>;
  private constant: number;

  constructor(config?: SymlogScaleConfig) {
    this.constant = config?.constant ?? 1;
    this.d3Scale = scaleSymlog<number, number>()
      .constant(this.constant)
      .domain([-10, 10])
      .range([0, 1]);

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
    // Symlog accepts all finite numbers including zero and negatives
    return Number.isFinite(value);
  }

  copy(): SymlogScale {
    const copied = new SymlogScale({ type: 'symlog', constant: this.constant });
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
   * Get the constant (linear region size)
   */
  getConstant(): number {
    return this.constant;
  }

  /**
   * Set the constant (linear region size)
   */
  setConstant(constant: number): this {
    this.constant = constant;
    this.d3Scale.constant(constant);
    return this;
  }

  /**
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScaleSymLog<number, number> {
    return this.d3Scale;
  }
}
