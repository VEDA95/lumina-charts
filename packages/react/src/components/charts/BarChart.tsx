import {
  BarChart as BarChartCore,
  type BarChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for BarChart
 *
 * @example
 * ```tsx
 * <BarChart
 *   data={[{ id: 'series1', name: 'Sales', data: [{ x: 0, y: 100 }, { x: 1, y: 150 }] }]}
 *   options={{ cornerRadius: 4 }}
 *   height={400}
 * >
 *   <HoverInteraction showTooltip />
 * </BarChart>
 * ```
 */
export const BarChart = createChartComponent<BarChartCore, BarChartOptions>(
  BarChartCore,
  'BarChart'
);

export type BarChartRef = ChartRef<BarChartCore>;
