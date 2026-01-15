/**
 * Time scale wrapper around D3's scaleTime/scaleUtc
 */

import { scaleTime, scaleUtc, type ScaleTime } from 'd3-scale';
import type { TimeScale as TimeScaleInterface, TimeScaleConfig } from '../types/scale.js';

/**
 * Time scale for datetime axes
 * Handles Date objects and timestamps with smart tick formatting
 */
export class TimeScale implements TimeScaleInterface {
  readonly type = 'time' as const;
  private d3Scale: ScaleTime<number, number>;
  private useUtc: boolean;

  constructor(config?: TimeScaleConfig) {
    this.useUtc = config?.utc ?? false;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (this.useUtc) {
      this.d3Scale = scaleUtc<number, number>()
        .domain([new Date(now - dayMs), new Date(now)])
        .range([0, 1]);
    } else {
      this.d3Scale = scaleTime<number, number>()
        .domain([new Date(now - dayMs), new Date(now)])
        .range([0, 1]);
    }

    if (config?.clamp) {
      this.d3Scale.clamp(true);
    }
  }

  domain(): [Date | number, Date | number];
  domain(d: [Date | number, Date | number]): this;
  domain(d?: [Date | number, Date | number]): [Date | number, Date | number] | this {
    if (d === undefined) {
      const dom = this.d3Scale.domain();
      return [dom[0], dom[1]] as [Date, Date];
    }
    // Convert to Date objects if timestamps
    const d0 = typeof d[0] === 'number' ? new Date(d[0]) : d[0];
    const d1 = typeof d[1] === 'number' ? new Date(d[1]) : d[1];
    this.d3Scale.domain([d0, d1]);
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

  scale(value: Date | number): number {
    const date = typeof value === 'number' ? new Date(value) : value;
    return this.d3Scale(date);
  }

  invert(value: number): Date | number {
    const date = this.d3Scale.invert(value);
    // Return timestamp (number) for consistency with how data is stored
    // This ensures hit testing works correctly since data points use timestamps
    return date.getTime();
  }

  ticks(count?: number): (Date | number)[] {
    return this.d3Scale.ticks(count);
  }

  tickFormat(count?: number, specifier?: string): (value: Date | number) => string {
    return this.d3Scale.tickFormat(count, specifier);
  }

  isValidDomainValue(value: Date | number): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    return Number.isFinite(value);
  }

  copy(): TimeScale {
    const copied = new TimeScale({ type: 'time', utc: this.useUtc });
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
   * Check if using UTC mode
   */
  isUtc(): boolean {
    return this.useUtc;
  }

  /**
   * Get the underlying D3 scale for advanced use cases
   */
  getD3Scale(): ScaleTime<number, number> {
    return this.d3Scale;
  }
}
