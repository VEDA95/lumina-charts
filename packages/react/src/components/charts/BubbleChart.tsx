import {
  BubbleChart as BubbleChartCore,
  type BubbleChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for BubbleChart
 *
 * @example
 * ```tsx
 * <BubbleChart
 *   data={[{ id: 'series1', name: 'Companies', data: [{ x: 10, y: 20, z: 100 }] }]}
 *   options={{ sizeRange: [5, 40] }}
 *   height={400}
 * >
 *   <ZoomInteraction />
 *   <HoverInteraction showTooltip />
 * </BubbleChart>
 * ```
 */
export const BubbleChart = createChartComponent<
  BubbleChartCore,
  BubbleChartOptions
>(BubbleChartCore, 'BubbleChart');

export type BubbleChartRef = ChartRef<BubbleChartCore>;
