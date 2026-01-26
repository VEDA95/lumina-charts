/**
 * Factory for creating scale instances from configuration
 */

import type {
  Scale,
  ScaleConfig,
  ScaleType,
  LinearScaleConfig,
  LogScaleConfig,
  PowScaleConfig,
  SqrtScaleConfig,
  SymlogScaleConfig,
  TimeScaleConfig,
  BandScaleConfig,
  ContinuousScale,
} from '../types/scale.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyScale = Scale<any, number>;
import { LinearScale } from './LinearScale.js';
import { LogScale } from './LogScale.js';
import { PowScale } from './PowScale.js';
import { SymlogScale } from './SymlogScale.js';
import { TimeScale } from './TimeScale.js';
import { BandScale } from './BandScale.js';

/**
 * Factory for creating scale instances
 */
export class ScaleFactory {
  /**
   * Create a scale from a configuration object
   */
  static create(config: ScaleConfig): AnyScale {
    if (config.type === 'linear') {
      return new LinearScale(config as LinearScaleConfig);
    }

    if (config.type === 'log') {
      return new LogScale(config as LogScaleConfig);
    }

    if (config.type === 'pow') {
      return new PowScale(config as PowScaleConfig);
    }

    if (config.type === 'sqrt') {
      return new PowScale(config as SqrtScaleConfig);
    }

    if (config.type === 'symlog') {
      return new SymlogScale(config as SymlogScaleConfig);
    }

    if (config.type === 'time') {
      return new TimeScale(config as TimeScaleConfig);
    }

    if (config.type === 'band') {
      return new BandScale(config as BandScaleConfig);
    }

    console.warn(`Unknown scale type: ${(config as ScaleConfig).type}, falling back to linear`);
    return new LinearScale();
  }

  /**
   * Create a scale from a type string with default configuration
   */
  static fromType(type: ScaleType): AnyScale {
    return ScaleFactory.create({ type } as ScaleConfig);
  }

  /**
   * Create a default linear scale
   */
  static linear(): LinearScale {
    return new LinearScale();
  }

  /**
   * Create a log scale with optional base
   */
  static log(base?: number): LogScale {
    return new LogScale({ type: 'log', base });
  }

  /**
   * Create a power scale with optional exponent
   */
  static pow(exponent?: number): PowScale {
    return new PowScale({ type: 'pow', exponent });
  }

  /**
   * Create a square root scale
   */
  static sqrt(): PowScale {
    return new PowScale({ type: 'sqrt' });
  }

  /**
   * Create a symlog scale with optional constant
   */
  static symlog(constant?: number): SymlogScale {
    return new SymlogScale({ type: 'symlog', constant });
  }

  /**
   * Create a time scale
   */
  static time(utc?: boolean): TimeScale {
    return new TimeScale({ type: 'time', utc });
  }

  /**
   * Create a band scale with optional categories
   */
  static band(categories?: string[]): BandScale {
    const scale = new BandScale();
    if (categories) {
      scale.domain(categories);
    }
    return scale;
  }

  /**
   * Check if a scale type is continuous (numeric)
   */
  static isContinuous(type: ScaleType): boolean {
    return type === 'linear' || type === 'log' || type === 'pow' || type === 'sqrt' || type === 'symlog';
  }

  /**
   * Check if a scale type is temporal
   */
  static isTemporal(type: ScaleType): boolean {
    return type === 'time';
  }

  /**
   * Check if a scale type is ordinal/categorical
   */
  static isOrdinal(type: ScaleType): boolean {
    return type === 'band';
  }

  /**
   * Get a continuous scale (type-safe helper)
   */
  static createContinuous(config: LinearScaleConfig | LogScaleConfig | PowScaleConfig | SqrtScaleConfig | SymlogScaleConfig): ContinuousScale {
    return ScaleFactory.create(config) as ContinuousScale;
  }
}
