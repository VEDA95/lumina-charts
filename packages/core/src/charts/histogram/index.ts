/**
 * Histogram chart exports
 */

export { HistogramChart, type HistogramChartConfig, type HistogramChartOptions } from './HistogramChart.js';
export { HistogramRenderPass, type HistogramRenderPassConfig, type HistogramBarData } from './HistogramRenderPass.js';
export { HistogramLinePass, type HistogramLinePassConfig, type OverlayCurve } from './HistogramLinePass.js';
export {
  binData,
  sturgesBinCount,
  scottBinCount,
  freedmanDiaconisBinCount,
  type BinConfig,
  type Bin,
  type BinResult,
} from './binning.js';
export {
  calculateKDE,
  scaleKDEToHistogram,
  calculateCumulative,
  calculateEmpiricalCDF,
  type KDEConfig,
  type CurvePoint,
} from './statistics.js';
