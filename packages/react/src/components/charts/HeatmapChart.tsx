import {
  HeatmapChart as HeatmapChartCore,
  type HeatmapChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for HeatmapChart
 *
 * @example
 * ```tsx
 * <HeatmapChart
 *   data={[{ id: 'matrix', name: 'Correlation', data: matrixData }]}
 *   options={{ colorScale: 'viridis', showValues: true }}
 *   height={400}
 * >
 *   <HoverInteraction showTooltip />
 * </HeatmapChart>
 * ```
 */
export const HeatmapChart = createChartComponent<
  HeatmapChartCore,
  HeatmapChartOptions
>(HeatmapChartCore, 'HeatmapChart');

export type HeatmapChartRef = ChartRef<HeatmapChartCore>;
