import {
  LineChart as LineChartCore,
  type LineChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for LineChart
 *
 * @example
 * ```tsx
 * <LineChart
 *   data={[{ id: 'series1', name: 'Series 1', data: [{ x: 0, y: 5 }, { x: 1, y: 10 }] }]}
 *   options={{ smooth: true, showArea: true }}
 *   height={400}
 * >
 *   <ZoomInteraction />
 *   <HoverInteraction showTooltip />
 * </LineChart>
 * ```
 */
export const LineChart = createChartComponent<LineChartCore, LineChartOptions>(
  LineChartCore,
  'LineChart'
);

export type LineChartRef = ChartRef<LineChartCore>;
