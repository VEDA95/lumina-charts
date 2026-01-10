/**
 * Data validation using Zod schemas
 */

import { z } from 'zod';
import { $ZodIssue } from 'zod/v4/core';

/**
 * Schema for a valid finite number (not NaN, not Infinity)
 */
export const finiteNumber = z.number().finite();

/**
 * Schema for a positive number
 */
export const positiveNumber = z.number().positive();

/**
 * Schema for a non-negative number
 */
export const nonNegativeNumber = z.number().nonnegative();

/**
 * Schema for a data point
 */
export const dataPointSchema = z
  .object({
    x: finiteNumber,
    y: finiteNumber,
  })
  .passthrough(); // Allow additional properties

/**
 * Schema for point shape
 */
export const pointShapeSchema = z.enum([
  'circle',
  'square',
  'triangle',
  'diamond',
  'cross',
  'star',
]);

/**
 * Schema for series style
 */
export const seriesStyleSchema = z
  .object({
    color: z.string().optional(),
    lineWidth: positiveNumber.optional(),
    pointSize: positiveNumber.optional(),
    pointShape: pointShapeSchema.optional(),
    fillOpacity: z.number().min(0).max(1).optional(),
    showLine: z.boolean().optional(),
    showPoints: z.boolean().optional(),
  })
  .strict();

/**
 * Schema for a series
 */
export const seriesSchema = z.object({
  id: z.string().min(1, 'Series ID cannot be empty'),
  name: z.string(),
  data: z.array(dataPointSchema),
  visible: z.boolean().optional(),
  style: seriesStyleSchema.optional(),
});

/**
 * Schema for an array of series with unique IDs
 */
export const seriesArraySchema = z.array(seriesSchema).refine(
  (series) => {
    const ids = series.map((s) => s.id);
    return new Set(ids).size === ids.length;
  },
  { message: 'Series IDs must be unique' }
);

/**
 * Schema for data domain
 */
export const dataDomainSchema = z.object({
  x: z.tuple([finiteNumber, finiteNumber]),
  y: z.tuple([finiteNumber, finiteNumber]),
});

/**
 * Schema for margins
 */
export const marginsSchema = z.object({
  top: nonNegativeNumber,
  right: nonNegativeNumber,
  bottom: nonNegativeNumber,
  left: nonNegativeNumber,
});

/**
 * Schema for tooltip config
 */
export const tooltipConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    followCursor: z.boolean().optional(),
    showDelay: nonNegativeNumber.optional(),
    hideDelay: nonNegativeNumber.optional(),
    offset: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .optional(),
  })
  .strict();

/**
 * Schema for pan config
 */
export const panConfigSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean(),
    button: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    modifierKey: z.enum(['ctrl', 'alt', 'shift', 'meta']).optional(),
  }),
]);

/**
 * Schema for zoom config
 */
export const zoomConfigSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean(),
    wheel: z.boolean().optional(),
    pinch: z.boolean().optional(),
    speed: positiveNumber.optional(),
    min: positiveNumber.optional(),
    max: positiveNumber.optional(),
  }),
]);

/**
 * Schema for select config
 */
export const selectConfigSchema = z.union([
  z.boolean(),
  z.object({
    enabled: z.boolean(),
    mode: z.enum(['single', 'multi', 'brush', 'lasso']).optional(),
    multiSelectKey: z.enum(['ctrl', 'alt', 'shift', 'meta']).optional(),
  }),
]);

/**
 * Schema for interaction config
 */
export const interactionConfigSchema = z
  .object({
    pan: panConfigSchema.optional(),
    zoom: zoomConfigSchema.optional(),
    select: selectConfigSchema.optional(),
    hover: z.boolean().optional(),
    click: z.boolean().optional(),
  })
  .strict();

/**
 * Schema for axis tick config
 */
export const tickConfigSchema = z
  .object({
    show: z.boolean().optional(),
    count: positiveNumber.optional(),
    values: z.array(finiteNumber).optional(),
    size: positiveNumber.optional(),
    padding: nonNegativeNumber.optional(),
  })
  .strict();

/**
 * Schema for grid config
 */
export const gridConfigSchema = z.union([
  z.boolean(),
  z.object({
    show: z.boolean().optional(),
    style: z.enum(['solid', 'dashed', 'dotted']).optional(),
    width: positiveNumber.optional(),
  }),
]);

/**
 * Schema for axis config
 */
export const axisConfigSchema = z
  .object({
    show: z.boolean().optional(),
    label: z.string().optional(),
    ticks: tickConfigSchema.optional(),
    grid: gridConfigSchema.optional(),
    domain: z.tuple([finiteNumber, finiteNumber]).optional(),
    type: z.enum(['linear', 'log', 'time', 'band']).optional(),
  })
  .strict();

/**
 * Schema for legend config
 */
export const legendConfigSchema = z
  .object({
    show: z.boolean().optional(),
    position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    align: z.enum(['start', 'center', 'end']).optional(),
    maxWidth: positiveNumber.optional(),
    maxHeight: positiveNumber.optional(),
  })
  .strict();

/**
 * Schema for theme config
 */
export const themeConfigSchema = z.union([
  z.string(),
  z.object({
    name: z.string().optional(),
    colors: z.array(z.string()).optional(),
    styles: z
      .object({
        lineWidth: positiveNumber.optional(),
        pointSize: positiveNumber.optional(),
        gridLineWidth: positiveNumber.optional(),
        axisLineWidth: positiveNumber.optional(),
      })
      .passthrough()
      .optional(),
  }),
]);

/**
 * Schema for base chart options
 */
export const chartOptionsSchema = z
  .object({
    margins: marginsSchema.optional(),
    theme: themeConfigSchema.optional(),
    animate: z.boolean().optional(),
    animationDuration: nonNegativeNumber.optional(),
    responsive: z.boolean().optional(),
    maintainAspectRatio: z.boolean().optional(),
    aspectRatio: positiveNumber.optional(),
    interaction: interactionConfigSchema.optional(),
    tooltip: tooltipConfigSchema.optional(),
    legend: legendConfigSchema.optional(),
  })
  .passthrough();

// Type exports inferred from schemas
export type DataPointInput = z.input<typeof dataPointSchema>;
export type DataPoint = z.output<typeof dataPointSchema>;
export type SeriesInput = z.input<typeof seriesSchema>;
export type Series = z.output<typeof seriesSchema>;
export type SeriesArrayInput = z.input<typeof seriesArraySchema>;
export type SeriesArray = z.output<typeof seriesArraySchema>;
export type ChartOptionsInput = z.input<typeof chartOptionsSchema>;
export type ChartOptions = z.output<typeof chartOptionsSchema>;

/**
 * Validate series data and return typed result
 * @throws {z.ZodError} If validation fails
 */
export function validateSeriesArray(data: unknown): Series[] {
  return seriesArraySchema.parse(data);
}

/**
 * Safely validate series data, returning a result object
 */
export function safeValidateSeriesArray(data: unknown): z.ZodSafeParseResult<SeriesArrayInput> {
  return seriesArraySchema.safeParse(data);
}

/**
 * Validate chart options
 * @throws {z.ZodError} If validation fails
 */
export function validateChartOptions(options: unknown): ChartOptions {
  return chartOptionsSchema.parse(options);
}

/**
 * Safely validate chart options
 */
export function safeValidateChartOptions(
  options: unknown
): z.ZodSafeParseResult<ChartOptionsInput> {
  return chartOptionsSchema.safeParse(options);
}

/**
 * Check if data is sorted by x values
 */
export function isDataSortedByX(data: Array<{ x: number }>): boolean {
  for (let i = 1; i < data.length; i++) {
    if (data[i].x < data[i - 1].x) {
      return false;
    }
  }
  return true;
}

/**
 * Schema that validates data is sorted by x
 */
export const sortedSeriesSchema = seriesSchema.refine((series) => isDataSortedByX(series.data), {
  message: 'Series data must be sorted by x values',
});

/**
 * Validate a series requires sorted data (for line charts)
 * @throws {z.ZodError} If validation fails
 */
export function validateSortedSeries(series: unknown): Series {
  return sortedSeriesSchema.parse(series);
}

/**
 * Format Zod errors into a readable message
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e: $ZodIssue): string => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    })
    .join('\n');
}
