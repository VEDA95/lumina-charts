/**
 * Data module exports
 */

export { LODManager, douglasPeuckerDecimate } from './LODManager.js';
export type { LODLevel, LODConfig } from './LODManager.js';

export { SpatialIndex } from './SpatialIndex.js';
export type { BoundingBox, IndexedPoint, SpatialHitResult } from './SpatialIndex.js';

export { DataProcessor } from './DataProcessor.js';
export type { ProcessPointOptions, ProcessLineOptions } from './DataProcessor.js';
