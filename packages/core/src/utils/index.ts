/**
 * Utility exports
 */

export { EventEmitter } from './EventEmitter.js';

export {
  clamp,
  lerp,
  inverseLerp,
  mapRange,
  approximately,
  roundTo,
  distance,
  distanceSquared,
  normalizeAngle,
  degToRad,
  radToDeg,
  nextPowerOf2,
  isPowerOf2,
  createIdentityMatrix,
  createOrthoMatrix,
  multiplyMatrices,
  createTranslationMatrix,
  createScaleMatrix,
  binarySearch,
  findClosestIndex,
} from './math.js';

export {
  createCanvas,
  resizeCanvas,
  getRelativePosition,
  isElementVisible,
  debounce,
  throttle,
  requestFrame,
  cancelFrame,
  getCSSVariable,
  setCSSVariable,
} from './dom.js';

export {
  positiveNumber,
  nonNegativeNumber,
  finiteNumber,
  dataPointSchema,
  dataDomainSchema,
  pointShapeSchema,
  seriesStyleSchema,
  seriesArraySchema,
  seriesSchema,
  marginsSchema,
  tooltipConfigSchema,
  panConfigSchema,
  zoomConfigSchema,
  axisConfigSchema,
  interactionConfigSchema,
  tickConfigSchema,
  gridConfigSchema,
  legendConfigSchema,
  selectConfigSchema,
  themeConfigSchema,
  chartOptionsSchema,
  validateSeriesArray,
  validateChartOptions,
  safeValidateSeriesArray,
  safeValidateChartOptions,
  validateSortedSeries,
  sortedSeriesSchema,
  formatZodError,
  isDataSortedByX,
} from './validation.js';

export { hexToRGBA, parseColor } from './color.js';
