/**
 * Line chart implementation
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
} from '../../types/index.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { LineRenderPass } from './LineRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';
import type { LODLevel } from '../../data/LODManager.js';
import { catmullRomSpline, type Point2D } from '../../utils/math.js';

/**
 * Line chart specific options
 */
export interface LineChartOptions extends ChartOptions {
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid configuration */
  grid?: boolean | GridConfig;
  /** Grid line color */
  gridColor?: RGBAColor;
  /** Default line width (pixels) */
  lineWidth?: number;
  /** Default line color */
  lineColor?: RGBAColor;
  /** Show data points on line */
  showPoints?: boolean;
  /** Point size when showing points */
  pointSize?: number;
  /** Point color (defaults to line color) */
  pointColor?: RGBAColor;
  /** Use smooth curved lines (Catmull-Rom spline interpolation) */
  smooth?: boolean;
  /** Smoothing tension (0 = sharp, 0.5 = default, 1 = very smooth) */
  smoothTension?: number;
}

/**
 * Line chart configuration
 */
export interface LineChartConfig extends BaseChartConfig {
  options?: LineChartOptions;
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
 * Line chart for visualizing continuous data
 */
export class LineChart extends BaseChart {
  private lineOptions: LineChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private lineRenderPass!: LineRenderPass;

  // LOD tracking
  private currentLODLevels: Map<string, number> = new Map();
  private lodEnabled: boolean = true;

  constructor(config: LineChartConfig) {
    const options = config.options ?? {};

    super(config);

    this.lineOptions = options;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.lineOptions.xAxis,
      yAxis: this.lineOptions.yAxis,
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.lineRenderPass = this.renderer.getRenderPass('line') as LineRenderPass;

    // Initialize axis renderer
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
   * Create render passes for line chart
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid render pass if enabled
    const gridConfig = this.lineOptions?.grid;
    if (gridConfig !== false) {
      const showHorizontal = typeof gridConfig === 'object' ? gridConfig.show !== false : true;
      const showVertical = typeof gridConfig === 'object' ? gridConfig.show !== false : true;

      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: this.lineOptions?.gridColor,
        showHorizontal,
        showVertical,
      });
      passes.push(gridPass);
    }

    // Add line render pass
    const linePass = new LineRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
    });
    passes.push(linePass);

    return passes;
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    this.currentLODLevels.clear();

    // Generate LOD levels for each series
    for (const s of series) {
      if (this.lodEnabled && s.data.length > 0) {
        // Sort data by x for proper LOD
        const sortedData = [...s.data].sort((a, b) => a.x - b.x);

        // Create Float32Array for LOD generation
        const xyData = new Float32Array(sortedData.length * 2);
        for (let i = 0; i < sortedData.length; i++) {
          xyData[i * 2] = sortedData[i].x;
          xyData[i * 2 + 1] = sortedData[i].y;
        }

        this.lodManager.generateLODLevels(s.id, xyData, sortedData.length);
        this.currentLODLevels.set(s.id, 0);
      }
    }

    // Upload data to GPU
    this.uploadDataToGPU(series);

    // Update axis renderer
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
    // Clear existing series data
    this.lineRenderPass.clearAllSeries();

    // Get visual options
    const showPoints = this.lineOptions.showPoints ?? false;
    const pointSize = this.lineOptions.pointSize ?? 6;
    const pointColor = this.lineOptions.pointColor;
    const smooth = this.lineOptions.smooth ?? false;
    const smoothTension = this.lineOptions.smoothTension ?? 0.5;

    // Process each series
    for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
      const s = series[seriesIndex];
      if (s.visible === false) continue;
      if (s.data.length < 2) continue;

      // Get color for this series
      const defaultColor = DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];
      const color: RGBAColor = s.style?.color ?? this.lineOptions.lineColor ?? defaultColor;

      // Get line width
      const lineWidth = s.style?.lineWidth ?? this.lineOptions.lineWidth ?? 2;

      // Get data at current LOD level
      const lodData = this.getSeriesDataAtLOD(s);

      // Sort data by x value for proper line rendering
      const sortedData = [...lodData].sort((a, b) => a.x - b.x);

      // Store original positions for point markers
      const originalPositions = new Float32Array(sortedData.length * 2);
      for (let i = 0; i < sortedData.length; i++) {
        originalPositions[i * 2] = sortedData[i].x;
        originalPositions[i * 2 + 1] = sortedData[i].y;
      }

      // Apply smooth interpolation if enabled
      let lineData: Point2D[] = sortedData;
      if (smooth && sortedData.length >= 2) {
        // Calculate segments based on data density (more points = fewer segments per pair)
        const segments = Math.max(4, Math.min(32, Math.ceil(200 / sortedData.length)));
        lineData = catmullRomSpline(sortedData, smoothTension, segments);
      }

      // Build position array for line
      const positions = new Float32Array(lineData.length * 2);
      for (let i = 0; i < lineData.length; i++) {
        positions[i * 2] = lineData[i].x;
        positions[i * 2 + 1] = lineData[i].y;
      }

      // Update render pass
      this.lineRenderPass.updateSeriesData({
        seriesId: s.id,
        positions,
        color,
        pointCount: lineData.length,
        lineWidth,
        showPoints,
        pointSize,
        pointColor: pointColor ?? color,
        originalPositions: showPoints ? originalPositions : undefined,
        originalPointCount: showPoints ? sortedData.length : undefined,
      });
    }
  }

  /**
   * Get series data at current LOD level
   */
  private getSeriesDataAtLOD(series: Series): DataPoint[] {
    if (!this.lodEnabled || !this.lodManager.hasLevels(series.id)) {
      return series.data;
    }

    // Select appropriate LOD level based on viewport and domain
    const { width } = this.state.viewport;
    const domain = this.state.domain;
    const initialDomain = this.getInitialDomain();

    if (!initialDomain || width === 0) {
      return series.data;
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
      return series.data;
    }

    // Convert decimated Float32Array to DataPoint array
    const decimatedData: DataPoint[] = [];
    for (let i = 0; i < lodLevel.pointCount; i++) {
      decimatedData.push({
        x: lodLevel.data[i * 2],
        y: lodLevel.data[i * 2 + 1],
      });
    }

    return decimatedData;
  }

  /**
   * Called when chart is resized
   */
  protected onResize(width: number, height: number): void {
    if (this.axisRenderer) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.render();
    }

    if (this.lineRenderPass) {
      this.lineRenderPass.setPixelRatio(this.pixelRatio);
    }

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
  protected onOptionsUpdate(options: Partial<LineChartOptions>): void {
    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      this.axisRenderer.updateConfig(options.xAxis, options.yAxis);
    }

    // Re-process data if visual properties changed
    const needsRerender =
      options.lineWidth !== undefined ||
      options.lineColor !== undefined ||
      options.showPoints !== undefined ||
      options.pointSize !== undefined ||
      options.pointColor !== undefined ||
      options.smooth !== undefined ||
      options.smoothTension !== undefined;

    if (needsRerender) {
      Object.assign(this.lineOptions, options);
      if (this.series.length > 0) {
        this.uploadDataToGPU(this.series);
      }
    }

    // Update margins if changed
    if (options.margins) {
      if (this.lineRenderPass) {
        this.lineRenderPass.setMargins(this.margins);
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
   * Get the axis renderer
   */
  getAxisRenderer(): AxisRenderer | null {
    return this.axisRenderer;
  }

  /**
   * Convert pixel to data coordinates
   */
  override pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.pixelToData(pixelX, pixelY);
    }
    const cssX = pixelX / this.pixelRatio;
    const cssY = pixelY / this.pixelRatio;
    return this.axisRenderer.pixelToData(cssX, cssY);
  }

  /**
   * Convert data to pixel coordinates
   */
  override dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.dataToPixel(dataX, dataY);
    }
    const { x, y } = this.axisRenderer.dataToPixel(dataX, dataY);
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
        // Re-generate LOD levels
        for (const s of this.series) {
          if (s.data.length > 0) {
            const sortedData = [...s.data].sort((a, b) => a.x - b.x);
            const xyData = new Float32Array(sortedData.length * 2);
            for (let i = 0; i < sortedData.length; i++) {
              xyData[i * 2] = sortedData[i].x;
              xyData[i * 2 + 1] = sortedData[i].y;
            }
            this.lodManager.generateLODLevels(s.id, xyData, sortedData.length);
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
   * Enable or disable smooth curved lines
   */
  setSmooth(enabled: boolean, tension?: number): void {
    const options: Partial<LineChartOptions> = { smooth: enabled };
    if (tension !== undefined) {
      options.smoothTension = tension;
    }
    this.updateOptions(options);
    this.render();
  }

  /**
   * Check if smooth lines are enabled
   */
  isSmooth(): boolean {
    return this.lineOptions.smooth ?? false;
  }

  /**
   * Enable or disable showing data points on lines
   */
  setShowPoints(enabled: boolean, size?: number): void {
    const options: Partial<LineChartOptions> = { showPoints: enabled };
    if (size !== undefined) {
      options.pointSize = size;
    }
    this.updateOptions(options);
    this.render();
  }

  /**
   * Check if data points are shown
   */
  isShowingPoints(): boolean {
    return this.lineOptions.showPoints ?? false;
  }

  /**
   * Get the axes as an image for export compositing
   */
  protected override async getAxesImage(): Promise<HTMLImageElement | null> {
    if (!this.axisRenderer) return null;
    return this.axisRenderer.toImage();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    this.currentLODLevels.clear();
    super.dispose();
  }
}
