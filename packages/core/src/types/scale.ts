/**
 * Scale type definitions for axis transformations
 */

/**
 * Supported scale types
 */
export type ScaleType = 'linear' | 'log' | 'pow' | 'sqrt' | 'symlog' | 'time' | 'band';

/**
 * Base scale configuration shared by all scale types
 */
export interface BaseScaleConfig {
  /** Scale type */
  type: ScaleType;
  /** Whether to clamp values outside domain to range bounds */
  clamp?: boolean;
  /** Apply nice rounding to domain bounds */
  nice?: boolean;
}

/**
 * Linear scale configuration (default)
 */
export interface LinearScaleConfig extends BaseScaleConfig {
  type: 'linear';
}

/**
 * Logarithmic scale configuration
 * Note: Domain values must be > 0
 */
export interface LogScaleConfig extends BaseScaleConfig {
  type: 'log';
  /** Log base (default: 10) */
  base?: number;
}

/**
 * Power scale configuration
 */
export interface PowScaleConfig extends BaseScaleConfig {
  type: 'pow';
  /** Exponent (default: 2) */
  exponent?: number;
}

/**
 * Square root scale configuration (power scale with exponent 0.5)
 */
export interface SqrtScaleConfig extends BaseScaleConfig {
  type: 'sqrt';
}

/**
 * Symmetric log scale configuration
 * Handles zero and negative values with a linear region around zero
 */
export interface SymlogScaleConfig extends BaseScaleConfig {
  type: 'symlog';
  /** Constant defining the linear region around zero (default: 1) */
  constant?: number;
}

/**
 * Time scale configuration for datetime axes
 */
export interface TimeScaleConfig extends BaseScaleConfig {
  type: 'time';
  /** Whether to use UTC (default: false, uses local time) */
  utc?: boolean;
}

/**
 * Band/category scale configuration for discrete values
 */
export interface BandScaleConfig extends BaseScaleConfig {
  type: 'band';
  /** Padding between bands as proportion of band width (0-1, default: 0.1) */
  padding?: number;
  /** Inner padding between bands (0-1) */
  paddingInner?: number;
  /** Outer padding at edges (0-1) */
  paddingOuter?: number;
  /** Band alignment (0-1, 0.5 = center, default: 0.5) */
  align?: number;
}

/**
 * Union type of all scale configurations
 */
export type ScaleConfig =
  | LinearScaleConfig
  | LogScaleConfig
  | PowScaleConfig
  | SqrtScaleConfig
  | SymlogScaleConfig
  | TimeScaleConfig
  | BandScaleConfig;

/**
 * Scale interface that all scale implementations must follow
 */
export interface Scale<TDomain = number, TRange = number> {
  /** Scale type identifier */
  readonly type: ScaleType;

  /** Set or get the domain (input values) */
  domain(): [TDomain, TDomain] | TDomain[];
  domain(d: [TDomain, TDomain] | TDomain[]): this;

  /** Set or get the range (output values) */
  range(): [TRange, TRange];
  range(r: [TRange, TRange]): this;

  /** Transform a domain value to a range value */
  scale(value: TDomain): TRange;

  /** Transform a range value back to a domain value */
  invert(value: TRange): TDomain;

  /** Get tick values for axis display */
  ticks(count?: number): TDomain[];

  /** Get a tick format function */
  tickFormat(count?: number, specifier?: string): (value: TDomain) => string;

  /** Check if a domain value is valid for this scale type */
  isValidDomainValue(value: TDomain): boolean;

  /** Create a copy of this scale */
  copy(): Scale<TDomain, TRange>;

  /** Apply nice rounding to domain */
  nice(count?: number): this;

  /** Set or get clamping behavior */
  clamp(): boolean;
  clamp(clamp: boolean): this;
}

/**
 * Continuous scale for numeric domains (linear, log, pow, symlog)
 */
export interface ContinuousScale extends Scale<number, number> {
  type: 'linear' | 'log' | 'pow' | 'sqrt' | 'symlog';
}

/**
 * Time scale for Date/timestamp domains
 */
export interface TimeScale extends Scale<Date | number, number> {
  type: 'time';
}

/**
 * Band scale for categorical/discrete domains
 */
export interface BandScale extends Scale<string, number> {
  type: 'band';

  /** Get the width of each band */
  bandwidth(): number;

  /** Get the step size (band width + padding) */
  step(): number;

  /** Get inner padding */
  paddingInner(): number;
  paddingInner(padding: number): this;

  /** Get outer padding */
  paddingOuter(): number;
  paddingOuter(padding: number): this;

  /** Get band alignment */
  align(): number;
  align(align: number): this;
}
