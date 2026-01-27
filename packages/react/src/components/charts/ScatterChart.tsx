import {
  ScatterChart as ScatterChartCore,
  type ScatterChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for ScatterChart
 *
 * @example
 * ```tsx
 * <ScatterChart
 *   data={[{ id: 'series1', name: 'Series 1', data: [{ x: 1, y: 2 }] }]}
 *   options={{ pointSize: 6 }}
 *   height={400}
 *   onHover={(e) => console.log(e)}
 * >
 *   <ZoomInteraction />
 *   <PanInteraction momentum />
 *   <HoverInteraction showTooltip />
 * </ScatterChart>
 * ```
 */
export const ScatterChart = createChartComponent<
  ScatterChartCore,
  ScatterChartOptions
>(ScatterChartCore, 'ScatterChart');

export type ScatterChartRef = ChartRef<ScatterChartCore>;
