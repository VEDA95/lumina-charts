import {
  CandlestickChart as CandlestickChartCore,
  type CandlestickChartOptions,
} from '@lumina-charts/core';
import { createChartComponent, type ChartRef } from '../createChartComponent.js';

/**
 * React component for CandlestickChart (OHLC)
 *
 * @example
 * ```tsx
 * <CandlestickChart
 *   data={[{ id: 'stock', name: 'AAPL', data: ohlcData }]}
 *   options={{ upColor: [0.2, 0.8, 0.2, 1], downColor: [0.8, 0.2, 0.2, 1] }}
 *   height={400}
 * >
 *   <ZoomInteraction direction="x" />
 *   <PanInteraction />
 *   <HoverInteraction showTooltip />
 * </CandlestickChart>
 * ```
 */
export const CandlestickChart = createChartComponent<
  CandlestickChartCore,
  CandlestickChartOptions
>(CandlestickChartCore, 'CandlestickChart');

export type CandlestickChartRef = ChartRef<CandlestickChartCore>;
