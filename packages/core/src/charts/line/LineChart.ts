/**
 * Line chart implementation
 */

import type {
  RenderPass,
  ChartOptions,
  AxisConfig,
  GridConfig,
  Series,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { LineRenderPass } from './LineRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';

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
    // Clear existing series data
    this.lineRenderPass.clearAllSeries();

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

      // Sort data by x value for proper line rendering
      const sortedData = [...s.data].sort((a, b) => a.x - b.x);

      // Build position array
      const positions = new Float32Array(sortedData.length * 2);
      for (let i = 0; i < sortedData.length; i++) {
        positions[i * 2] = sortedData[i].x;
        positions[i * 2 + 1] = sortedData[i].y;
      }

      // Update render pass
      this.lineRenderPass.updateSeriesData({
        seriesId: s.id,
        positions,
        color,
        pointCount: sortedData.length,
        lineWidth,
      });
    }

    // Update axis renderer
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
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
    if (options.lineWidth || options.lineColor) {
      Object.assign(this.lineOptions, options);
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
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
   * Clean up resources
   */
  dispose(): void {
    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    super.dispose();
  }
}
