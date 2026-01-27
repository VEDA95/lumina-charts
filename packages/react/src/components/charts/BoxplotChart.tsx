import {
  BoxplotChart as BoxplotChartCore,
  type BoxplotChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for BoxplotChart
 *
 * @example
 * ```tsx
 * <BoxplotChart
 *   data={[{ id: 'dist', name: 'Distribution', data: quartileData }]}
 *   options={{ orientation: 'vertical', showOutliers: true }}
 *   height={400}
 * >
 *   <HoverInteraction showTooltip />
 * </BoxplotChart>
 * ```
 */
export const BoxplotChart = createChartComponent<
  BoxplotChartCore,
  BoxplotChartOptions
>(BoxplotChartCore, 'BoxplotChart');

export type BoxplotChartRef = ChartRef<BoxplotChartCore>;
