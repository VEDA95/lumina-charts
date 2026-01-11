/**
 * Scatter chart implementation
 */

import type {
  RenderPass,
  ChartOptions,
  AxisConfig,
  GridConfig,
  Series,
  DataPoint,
  RGBAColor,
  DataDomain,
  ProcessedSeriesData,
} from '../../types/index.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { ScatterRenderPass } from './ScatterRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';
import type { LODLevel } from '../../data/LODManager.js';

/**
 * Point shape types
 */
export type PointShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'star';

/**
 * Shape to numeric value mapping
 */
const SHAPE_VALUES: Record<PointShape, number> = {
  circle: 0,
  square: 1,
  triangle: 2,
  diamond: 3,
  cross: 4,
  star: 5,
};

/**
 * Scatter chart specific options
 */
export interface ScatterChartOptions extends ChartOptions {
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid configuration */
  grid?: boolean | GridConfig;
  /** Grid line color */
  gridColor?: RGBAColor;
  /** Point size (pixels) or accessor function */
  pointSize?: number | ((point: DataPoint, index: number, series: Series) => number);
  /** Point color or accessor function */
  pointColor?: RGBAColor | ((point: DataPoint, index: number, series: Series) => RGBAColor);
  /** Point shape or accessor function */
  pointShape?: PointShape | ((point: DataPoint, index: number, series: Series) => PointShape);
}

/**
 * Scatter chart configuration
 */
export interface ScatterChartConfig extends BaseChartConfig {
  options?: ScatterChartOptions;
}

/**
 * Default series colors
 */
const DEFAULT_COLORS: RGBAColor[] = [
  [0.4, 0.4, 0.8, 1.0], // Blue
  [0.8, 0.4, 0.4, 1.0], // Red
  [0.4, 0.8, 0.4, 1.0], // Green
  [0.8, 0.6, 0.2, 1.0], // Orange
  [0.6, 0.4, 0.8, 1.0], // Purple
  [0.2, 0.7, 0.7, 1.0], // Teal
  [0.8, 0.5, 0.6, 1.0], // Pink
  [0.5, 0.5, 0.5, 1.0], // Gray
];

/**
 * Scatter chart for visualizing point data
 */
export class ScatterChart extends BaseChart {
  private scatterOptions: ScatterChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private scatterRenderPass!: ScatterRenderPass;
  private processedData: Map<string, ProcessedSeriesData> = new Map();

  // LOD tracking
  private rawSeriesData: Map<string, Series> = new Map();
  private currentLODLevels: Map<string, number> = new Map();
  private lodEnabled: boolean = true;

  constructor(config: ScatterChartConfig) {
    // Store options before super() so createRenderPasses() can access them
    const options = config.options ?? {};

    super(config);

    this.scatterOptions = options;

    // Initialize axis renderer after super() completes
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.scatterOptions.xAxis,
      yAxis: this.scatterOptions.yAxis,
    });

    // Get the render passes from the passes we created
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.scatterRenderPass = this.renderer.getRenderPass('scatter-points') as ScatterRenderPass;

    // Now that everything is initialized, trigger initial setup
    this.initializeAxisRenderer();
  }

  /**
   * Initialize axis renderer with current state
   */
  private initializeAxisRenderer(): void {
    if (!this.axisRenderer) return;

    const { width, height } = this.getState().viewport;
    if (width > 0 && height > 0) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.setDomain(this.getState().domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Create render passes for scatter chart
   * Note: This is called from super() before scatterOptions is set,
   * so we use optional chaining with defaults
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid render pass if enabled (default to showing grid)
    const gridConfig = this.scatterOptions?.grid;
    if (gridConfig !== false) {
      const showHorizontal = typeof gridConfig === 'object' ? gridConfig.show !== false : true;
      const showVertical = typeof gridConfig === 'object' ? gridConfig.show !== false : true;

      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: this.scatterOptions?.gridColor,
        showHorizontal,
        showVertical,
      });
      passes.push(gridPass);
    }

    // Add scatter render pass
    const scatterPass = new ScatterRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
    });
    passes.push(scatterPass);

    return passes;
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    this.processedData.clear();
    this.rawSeriesData.clear();
    this.currentLODLevels.clear();

    // Store raw series and generate LOD levels
    for (const s of series) {
      this.rawSeriesData.set(s.id, s);

      if (this.lodEnabled && s.data.length > 0) {
        // Create Float32Array of x,y pairs for LOD generation
        const xyData = new Float32Array(s.data.length * 2);
        for (let i = 0; i < s.data.length; i++) {
          xyData[i * 2] = s.data[i].x;
          xyData[i * 2 + 1] = s.data[i].y;
        }

        // Generate LOD levels using scatter-specific grid-based decimation
        this.lodManager.generateScatterLODLevels(s.id, xyData, s.data.length);
        this.currentLODLevels.set(s.id, 0); // Start at full resolution
      }
    }

    // Process and upload data (will use appropriate LOD level)
    this.uploadDataToGPU(series);

    // Update axis renderer domain and sync grid ticks
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Upload current LOD level data to GPU
   */
  private uploadDataToGPU(series: Series[]): void {
    const allPoints: Float32Array[] = [];
    let totalPoints = 0;

    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const s = series[seriesIndex];
      if (s.visible === false) continue;

      // Get current LOD level for this series
      const seriesData = this.getSeriesDataAtLOD(s, seriesIndex);
      const processed = this.processSeries(seriesData, seriesIndex);
      this.processedData.set(s.id, processed);

      allPoints.push(processed.positions);
      totalPoints += processed.pointCount;
    }

    // Merge all point data into a single buffer
    if (totalPoints > 0) {
      const stride = 8; // floats per point
      const mergedBuffer = new Float32Array(totalPoints * stride);
      let offset = 0;

      for (const buffer of allPoints) {
        mergedBuffer.set(buffer, offset);
        offset += buffer.length;
      }

      this.scatterRenderPass.updateData({
        positions: mergedBuffer,
        colors: new Float32Array(0),
        pointCount: totalPoints,
        bounds: this.state.domain,
      });
    }
  }

  /**
   * Get series data at current LOD level
   */
  private getSeriesDataAtLOD(series: Series, seriesIndex: number): Series {
    if (!this.lodEnabled || !this.lodManager.hasLevels(series.id)) {
      return series;
    }

    // Select appropriate LOD level based on viewport and domain
    const { width } = this.state.viewport;
    const domain = this.state.domain;
    const initialDomain = this.getInitialDomain();

    if (!initialDomain || width === 0) {
      return series;
    }

    const lodLevel = this.lodManager.selectLODLevel(
      series.id,
      width,
      [domain.x[0], domain.x[1]],
      [initialDomain.x[0], initialDomain.x[1]]
    );

    // Track current level
    this.currentLODLevels.set(series.id, lodLevel.level);

    // If at level 0 (full resolution), return original data
    if (lodLevel.level === 0) {
      return series;
    }

    // Convert decimated Float32Array back to DataPoint array
    const decimatedData: DataPoint[] = [];
    for (let i = 0; i < lodLevel.pointCount; i++) {
      decimatedData.push({
        x: lodLevel.data[i * 2],
        y: lodLevel.data[i * 2 + 1],
      });
    }

    // Return series with decimated data
    return {
      ...series,
      data: decimatedData,
    };
  }

  /**
   * Process a single series into GPU format
   */
  private processSeries(series: Series, seriesIndex: number): ProcessedSeriesData {
    const { pointSize, pointColor, pointShape } = this.scatterOptions;
    const defaultColor = DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];

    // Create accessor functions
    const sizeAccessor = this.createSizeAccessor(pointSize);
    const colorAccessor = this.createColorAccessor(pointColor, defaultColor, series);
    const shapeAccessor = this.createShapeAccessor(pointShape);

    return this.dataProcessor.processPointData(series, {
      sizeAccessor,
      colorAccessor,
      shapeAccessor,
      defaultSize: 6,
      defaultColor,
      defaultShape: 0,
    });
  }

  /**
   * Create size accessor function
   */
  private createSizeAccessor(
    pointSize: ScatterChartOptions['pointSize']
  ): (point: DataPoint, index: number, series: Series) => number {
    if (typeof pointSize === 'number') {
      return () => pointSize;
    }
    if (typeof pointSize === 'function') {
      return pointSize;
    }
    return () => 6; // default
  }

  /**
   * Create color accessor function
   */
  private createColorAccessor(
    pointColor: ScatterChartOptions['pointColor'],
    defaultColor: RGBAColor,
    series: Series
  ): (point: DataPoint, index: number, series: Series) => RGBAColor {
    // Check if series has a style color defined
    if (series.style?.color) {
      const seriesColor = series.style.color;
      return () => seriesColor;
    }

    if (Array.isArray(pointColor)) {
      return () => pointColor as RGBAColor;
    }
    if (typeof pointColor === 'function') {
      return pointColor;
    }
    return () => defaultColor;
  }

  /**
   * Create shape accessor function
   */
  private createShapeAccessor(
    pointShape: ScatterChartOptions['pointShape']
  ): (point: DataPoint, index: number, series: Series) => number {
    if (typeof pointShape === 'string') {
      const shapeValue = SHAPE_VALUES[pointShape] ?? 0;
      return () => shapeValue;
    }
    if (typeof pointShape === 'function') {
      return (point, index, series) => {
        const shape = pointShape(point, index, series);
        return SHAPE_VALUES[shape] ?? 0;
      };
    }
    return () => 0; // default to circle
  }

  /**
   * Called when chart is resized
   */
  protected onResize(width: number, height: number): void {
    // Update axis renderer size (use CSS pixels, not device pixels)
    if (this.axisRenderer) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.render();
    }

    // Update render pass pixel ratio (may not be set during initial construction)
    if (this.scatterRenderPass) {
      this.scatterRenderPass.setPixelRatio(this.pixelRatio);
    }

    // Update grid render pass
    if (this.gridRenderPass) {
      this.gridRenderPass.setPixelRatio(this.pixelRatio);
      this.syncGridTicks();
    }
  }

  /**
   * Called when domain changes
   */
  protected onDomainChange(domain: DataDomain): void {
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(domain);
      this.axisRenderer.render();
    }
    this.syncGridTicks();

    // Check if LOD level needs to change
    if (this.lodEnabled) {
      this.checkLODLevelChange();
    }
  }

  /**
   * Check if LOD level needs to change and update if so
   */
  private checkLODLevelChange(): void {
    const { width } = this.state.viewport;
    const domain = this.state.domain;
    const initialDomain = this.getInitialDomain();

    if (!initialDomain || width === 0 || this.series.length === 0) {
      return;
    }

    let needsUpdate = false;

    for (const s of this.series) {
      if (!this.lodManager.hasLevels(s.id)) continue;

      const lodLevel = this.lodManager.selectLODLevel(
        s.id,
        width,
        [domain.x[0], domain.x[1]],
        [initialDomain.x[0], initialDomain.x[1]]
      );

      const currentLevel = this.currentLODLevels.get(s.id) ?? 0;

      if (lodLevel.level !== currentLevel) {
        console.log(`LOD level change: ${currentLevel} -> ${lodLevel.level} (${lodLevel.pointCount} points)`);
        needsUpdate = true;
        break;
      }
    }

    if (needsUpdate) {
      this.uploadDataToGPU(this.series);
    }
  }

  /**
   * Sync grid tick positions with axis renderer
   */
  private syncGridTicks(): void {
    if (!this.gridRenderPass || !this.axisRenderer) return;

    const xTicks = this.axisRenderer.getXTicks();
    const yTicks = this.axisRenderer.getYTicks();
    this.gridRenderPass.setTicks(xTicks, yTicks);
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<ScatterChartOptions>): void {
    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      this.axisRenderer.updateConfig(options.xAxis, options.yAxis);
    }

    // Re-process data if visual properties changed
    if (options.pointSize || options.pointColor || options.pointShape) {
      Object.assign(this.scatterOptions, options);
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
      }
    }

    // Update margins if changed
    if (options.margins) {
      if (this.scatterRenderPass) {
        this.scatterRenderPass.setMargins(this.margins);
      }
      if (this.axisRenderer) {
        this.axisRenderer.setMargins(this.margins);
      }
      if (this.gridRenderPass) {
        this.gridRenderPass.setMargins(this.margins);
      }
    }

    // Update grid color if changed
    if (options.gridColor && this.gridRenderPass) {
      this.gridRenderPass.setColor(options.gridColor);
    }
  }

  /**
   * Render the chart
   */
  render(): void {
    super.render();
    if (this.axisRenderer) {
      this.axisRenderer.render();
    }
  }

  /**
   * Get the axis renderer (for coordinate conversion)
   */
  getAxisRenderer(): AxisRenderer | null {
    return this.axisRenderer;
  }

  /**
   * Convert pixel to data coordinates using axis scales
   */
  override pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    // Fall back to base implementation if axis renderer not ready
    if (!this.axisRenderer) {
      return super.pixelToData(pixelX, pixelY);
    }
    // Convert from device pixels to CSS pixels for axis renderer
    const cssX = pixelX / this.pixelRatio;
    const cssY = pixelY / this.pixelRatio;
    return this.axisRenderer.pixelToData(cssX, cssY);
  }

  /**
   * Convert data to pixel coordinates using axis scales
   */
  override dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    // Fall back to base implementation if axis renderer not ready
    if (!this.axisRenderer) {
      return super.dataToPixel(dataX, dataY);
    }
    const { x, y } = this.axisRenderer.dataToPixel(dataX, dataY);
    // Convert from CSS pixels to device pixels
    return {
      x: x * this.pixelRatio,
      y: y * this.pixelRatio,
    };
  }

  /**
   * Enable or disable LOD (Level of Detail)
   */
  setLODEnabled(enabled: boolean): void {
    if (this.lodEnabled === enabled) return;

    this.lodEnabled = enabled;

    // Re-process data with new LOD setting
    if (this.series.length > 0) {
      if (enabled) {
        // Re-generate LOD levels using scatter-specific method
        for (const s of this.series) {
          if (s.data.length > 0) {
            const xyData = new Float32Array(s.data.length * 2);
            for (let i = 0; i < s.data.length; i++) {
              xyData[i * 2] = s.data[i].x;
              xyData[i * 2 + 1] = s.data[i].y;
            }
            this.lodManager.generateScatterLODLevels(s.id, xyData, s.data.length);
            this.currentLODLevels.set(s.id, 0);
          }
        }
      } else {
        // Clear LOD data
        this.lodManager.clear();
        this.currentLODLevels.clear();
      }

      this.uploadDataToGPU(this.series);
    }
  }

  /**
   * Check if LOD is enabled
   */
  isLODEnabled(): boolean {
    return this.lodEnabled;
  }

  /**
   * Get current LOD level for a series
   */
  getLODLevel(seriesId: string): number {
    return this.currentLODLevels.get(seriesId) ?? 0;
  }

  /**
   * Get LOD memory usage statistics
   */
  getLODMemoryUsage(): { seriesCount: number; totalBytes: number; levelCounts: number[] } {
    return this.lodManager.getMemoryUsage();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    this.processedData.clear();
    this.rawSeriesData.clear();
    this.currentLODLevels.clear();
    super.dispose();
  }
}
