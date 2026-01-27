import {
  HistogramChart as HistogramChartCore,
  type HistogramChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for HistogramChart
 *
 * @example
 * ```tsx
 * <HistogramChart
 *   data={[{ id: 'dist', name: 'Distribution', data: values.map(v => ({ x: v, y: 0 })) }]}
 *   options={{ binCount: 20, showKDE: true }}
 *   height={400}
 * >
 *   <HoverInteraction showTooltip />
 * </HistogramChart>
 * ```
 */
export const HistogramChart = createChartComponent<
  HistogramChartCore,
  HistogramChartOptions
>(HistogramChartCore, 'HistogramChart');

export type HistogramChartRef = ChartRef<HistogramChartCore>;
