/**
 * Histogram chart implementation for visualizing distributions
 */

import type {
  RenderPass,
  ChartOptions,
  AxisConfig,
  GridConfig,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import type { AnimationConfig } from '../../animations/index.js';
import { HistogramRenderPass, type HistogramBarData } from './HistogramRenderPass.js';
import { HistogramLinePass, type OverlayCurve } from './HistogramLinePass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';
import { binData, type BinConfig, type Bin, type BinResult } from './binning.js';
import {
  calculateKDE,
  scaleKDEToHistogram,
  calculateCumulative,
  type KDEConfig,
  type CurvePoint,
} from './statistics.js';

/**
 * Histogram chart specific options
 */
export interface HistogramChartOptions extends ChartOptions {
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Grid configuration */
  grid?: boolean | GridConfig;
  /** Grid line color */
  gridColor?: RGBAColor;
  /** Binning configuration */
  binning?: {
    /** Binning method: 'count' for fixed number of bins, 'width' for fixed bin width */
    method: 'count' | 'width';
    /** Number of bins (if method='count') or bin width (if method='width') */
    value: number;
  };
  /** Bar color */
  barColor?: RGBAColor;
  /** Gap between bars (pixels, default: 1) */
  barGap?: number;
  /** Show density curve (KDE) overlay */
  showDensityCurve?: boolean;
  /** Density curve color */
  densityCurveColor?: RGBAColor;
  /** Density curve line width */
  densityCurveWidth?: number;
  /** KDE bandwidth (auto-calculated if not provided) */
  densityBandwidth?: number;
  /** Show cumulative distribution overlay */
  showCumulative?: boolean;
  /** Cumulative distribution color */
  cumulativeColor?: RGBAColor;
  /** Cumulative line width */
  cumulativeWidth?: number;
  /** Corner radius for rounded bars (0 = square corners) */
  cornerRadius?: number;
}

/**
 * Histogram chart configuration
 */
export interface HistogramChartConfig extends BaseChartConfig {
  options?: HistogramChartOptions;
}

/**
 * Default histogram bar color
 */
const DEFAULT_BAR_COLOR: RGBAColor = [0.4, 0.6, 0.9, 1.0];
const DEFAULT_DENSITY_COLOR: RGBAColor = [0.9, 0.3, 0.3, 1.0];
const DEFAULT_CUMULATIVE_COLOR: RGBAColor = [0.3, 0.7, 0.3, 1.0];

/**
 * Histogram chart for visualizing distributions of continuous data
 */
export class HistogramChart extends BaseChart {
  private histogramOptions: HistogramChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private histogramRenderPass!: HistogramRenderPass;
  private linePass: HistogramLinePass | null = null;

  // Raw data values
  private values: number[] = [];

  // Computed bins
  private binResult: BinResult | null = null;

  // Overlay data
  private kdeCurve: CurvePoint[] = [];
  private cumulativeCurve: CurvePoint[] = [];

  // Hover and selection state
  private hoveredBinIndex: number | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private pointerLeaveHandler: (() => void) | null = null;
  private clickHandler: ((e: PointerEvent) => void) | null = null;

  constructor(config: HistogramChartConfig) {
    const options = config.options ?? {};

    super(config);

    this.histogramOptions = options;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.histogramOptions.xAxis,
      yAxis: this.histogramOptions.yAxis,
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.histogramRenderPass = this.renderer.getRenderPass('histogram') as HistogramRenderPass;
    this.linePass = this.renderer.getRenderPass('histogram-line') as HistogramLinePass | null;

    // Initialize axis renderer
    this.initializeAxisRenderer();

    // Setup hover event handling for bin tooltips
    this.setupHoverHandling();
  }

  /**
   * Setup pointer event handling for bin tooltips
   */
  private setupHoverHandling(): void {
    const canvas = this.canvas;
    const tooltipElement = this.getTooltipElement();

    // Setup tooltip styles (shadcn-style, light mode default - CSS overrides for dark)
    tooltipElement.className = 'lumina-tooltip';
    tooltipElement.style.cssText = `
      position: absolute;
      display: none;
      pointer-events: none;
      z-index: 100;
      background: #ffffff;
      color: #09090b;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e4e4e7;
      font-size: 12px;
      line-height: 1.5;
      font-family: Geist, Inter, ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
      transform: translate(-50%, -100%);
      margin-top: -10px;
    `;

    this.pointerMoveHandler = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelX = (e.clientX - rect.left) * this.pixelRatio;
      const pixelY = (e.clientY - rect.top) * this.pixelRatio;

      const hit = this.hitTestBin(pixelX, pixelY);

      if (hit) {
        if (this.hoveredBinIndex !== hit.binIndex) {
          this.hoveredBinIndex = hit.binIndex;

          // Get bin data
          const bin = this.binResult?.bins[hit.binIndex];
          if (bin) {
            // Format tooltip content
            const rangeStr = `${bin.x0.toFixed(2)} - ${bin.x1.toFixed(2)}`;
            const countStr = bin.count.toString();
            const percentStr = this.values.length > 0
              ? ((bin.count / this.values.length) * 100).toFixed(1)
              : '0';

            tooltipElement.innerHTML = `
              <div style="font-weight: 500; margin-bottom: 4px;">Bin ${hit.binIndex + 1}</div>
              <div style="display: flex; justify-content: space-between; gap: 12px;"><span style="opacity: 0.7;">Range</span><span style="font-family: 'Geist Mono', monospace;">${rangeStr}</span></div>
              <div style="display: flex; justify-content: space-between; gap: 12px;"><span style="opacity: 0.7;">Count</span><span style="font-family: 'Geist Mono', monospace;">${countStr} (${percentStr}%)</span></div>
            `;
            tooltipElement.style.display = 'block';

            // Emit hover event
            this.emit('hover', {
              hit: {
                seriesId: 'histogram',
                pointIndex: hit.binIndex,
                point: { x: (bin.x0 + bin.x1) / 2, y: bin.count },
                distance: 0,
              },
              series: { id: 'histogram', name: 'Histogram', data: [] },
              point: { x: (bin.x0 + bin.x1) / 2, y: bin.count },
              pixel: { x: pixelX, y: pixelY },
              data: { x: (bin.x0 + bin.x1) / 2, y: bin.count },
              timestamp: Date.now(),
              originalEvent: e,
            });
          }
        }

        // Update tooltip position
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        tooltipElement.style.left = `${cssX}px`;
        tooltipElement.style.top = `${cssY}px`;
      } else {
        if (this.hoveredBinIndex !== null) {
          this.hoveredBinIndex = null;
          tooltipElement.style.display = 'none';
          this.emit('hoverEnd', undefined);
        }
      }
    };

    this.pointerLeaveHandler = () => {
      if (this.hoveredBinIndex !== null) {
        this.hoveredBinIndex = null;
        tooltipElement.style.display = 'none';
        this.emit('hoverEnd', undefined);
      }
    };

    this.clickHandler = (e: PointerEvent) => {
      // Only handle left click
      if (e.button !== 0) return;

      const rect = canvas.getBoundingClientRect();
      const pixelX = (e.clientX - rect.left) * this.pixelRatio;
      const pixelY = (e.clientY - rect.top) * this.pixelRatio;

      const hit = this.hitTestBin(pixelX, pixelY);
      const state = this.getState();
      const previousSelected = new Set(state.selectedPoints);

      if (hit) {
        const pointId = `histogram:${hit.binIndex}`;

        // Check for multi-select (shift key)
        if (e.shiftKey) {
          // Toggle selection
          if (state.selectedPoints.has(pointId)) {
            state.selectedPoints.delete(pointId);
          } else {
            state.selectedPoints.add(pointId);
          }
        } else {
          // Single selection - replace
          state.selectedPoints.clear();
          state.selectedPoints.add(pointId);
        }
      } else if (!e.shiftKey) {
        // Click on empty space clears selection (unless shift is held)
        state.selectedPoints.clear();
      }

      // Emit selection change event
      const added: string[] = [];
      const removed: string[] = [];

      for (const id of state.selectedPoints) {
        if (!previousSelected.has(id)) {
          added.push(id);
        }
      }
      for (const id of previousSelected) {
        if (!state.selectedPoints.has(id)) {
          removed.push(id);
        }
      }

      if (added.length > 0 || removed.length > 0) {
        this.emit('selectionChange', {
          selected: state.selectedPoints,
          added,
          removed,
        });
      }
    };

    canvas.addEventListener('pointermove', this.pointerMoveHandler);
    canvas.addEventListener('pointerleave', this.pointerLeaveHandler);
    canvas.addEventListener('click', this.clickHandler);
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
   * Create render passes for histogram chart
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid render pass if enabled
    const gridConfig = this.histogramOptions?.grid;
    if (gridConfig !== false) {
      const showHorizontal = typeof gridConfig === 'object' ? gridConfig.show !== false : true;
      const showVertical = typeof gridConfig === 'object' ? gridConfig.show !== false : true;

      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: this.histogramOptions?.gridColor,
        showHorizontal,
        showVertical,
      });
      passes.push(gridPass);
    }

    // Add histogram render pass
    // Note: Access options via this.options since this.histogramOptions is set after super()
    const histOptions = this.options as HistogramChartOptions;
    const histogramPass = new HistogramRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
      cornerRadius: histOptions?.cornerRadius,
    });
    passes.push(histogramPass);

    // Add line render pass for overlays (KDE, cumulative)
    const linePass = new HistogramLinePass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
    });
    passes.push(linePass);

    return passes;
  }

  /**
   * Set histogram data values
   */
  setValues(values: number[], options?: { animate?: boolean; animationConfig?: AnimationConfig }): void {
    const hadPreviousData = this.values.length > 0;
    this.values = values;
    this.processData(options?.animate && hadPreviousData, options?.animationConfig);
    this.render();
  }

  /**
   * Get current values
   */
  getValues(): number[] {
    return this.values;
  }

  /**
   * Get computed bins
   */
  getBins(): Bin[] {
    return this.binResult?.bins ?? [];
  }

  /**
   * Get bin result with metadata
   */
  getBinResult(): BinResult | null {
    return this.binResult;
  }

  /**
   * Update binning configuration
   */
  setBinning(config: { method: 'count' | 'width'; value: number }): void {
    this.histogramOptions.binning = config;
    if (this.values.length > 0) {
      this.processData();
    }
  }

  /**
   * Enable/disable overlays
   */
  setOverlays(options: {
    showDensityCurve?: boolean;
    showCumulative?: boolean;
  }): void {
    if (options.showDensityCurve !== undefined) {
      this.histogramOptions.showDensityCurve = options.showDensityCurve;
    }
    if (options.showCumulative !== undefined) {
      this.histogramOptions.showCumulative = options.showCumulative;
    }
    if (this.values.length > 0) {
      this.processData();
    }
  }

  /**
   * Get KDE curve points
   */
  getKDECurve(): CurvePoint[] {
    return this.kdeCurve;
  }

  /**
   * Get cumulative distribution curve points
   */
  getCumulativeCurve(): CurvePoint[] {
    return this.cumulativeCurve;
  }

  /**
   * Process data: compute bins and overlays
   * @param animate - Whether to animate the domain transition
   * @param animationConfig - Animation configuration
   */
  private processData(animate?: boolean, animationConfig?: AnimationConfig): void {
    if (this.values.length === 0) {
      this.binResult = null;
      this.kdeCurve = [];
      this.cumulativeCurve = [];
      this.histogramRenderPass?.clear();
      this.linePass?.clear();
      return;
    }

    // Get binning configuration
    const binConfig: BinConfig = {
      method: this.histogramOptions.binning?.method ?? 'count',
      value: this.histogramOptions.binning?.value ?? 10,
    };

    // Compute bins
    this.binResult = binData(this.values, binConfig);

    // Calculate domain
    const xDomain: [number, number] = [this.binResult.min, this.binResult.max];

    // Y domain: 0 to max bin count with 10% padding
    let maxCount = 0;
    for (const bin of this.binResult.bins) {
      maxCount = Math.max(maxCount, bin.count);
    }
    maxCount = maxCount * 1.1 || 1;
    const yDomain: [number, number] = [0, maxCount];

    const newDomain: DataDomain = { x: xDomain, y: yDomain };

    // Update initial domain (for zoom reset)
    this.initialDomain = { x: [...xDomain], y: [...yDomain] };

    // Calculate overlays
    this.calculateOverlays();

    // Update render pass
    this.updateHistogramData();

    // Update domain - use animation if requested
    const shouldAnimate = animate && this.options.animate !== false;
    if (shouldAnimate) {
      this.setDomain(newDomain, { animate: true, animationConfig });
    } else {
      this.state.domain = newDomain;
      if (this.axisRenderer) {
        this.axisRenderer.setDomain(this.state.domain);
        this.axisRenderer.render();
        this.syncGridTicks();
      }
    }
  }

  /**
   * Calculate overlay curves (KDE, cumulative)
   */
  private calculateOverlays(): void {
    if (!this.binResult || this.values.length === 0) {
      this.kdeCurve = [];
      this.cumulativeCurve = [];
      return;
    }

    // Calculate KDE if enabled
    if (this.histogramOptions.showDensityCurve) {
      const kdeConfig: KDEConfig = {
        bandwidth: this.histogramOptions.densityBandwidth,
        min: this.binResult.min,
        max: this.binResult.max,
      };
      const rawKDE = calculateKDE(this.values, kdeConfig);
      // Scale to match histogram height
      this.kdeCurve = scaleKDEToHistogram(rawKDE, this.values.length, this.binResult.binWidth);
    } else {
      this.kdeCurve = [];
    }

    // Calculate cumulative distribution if enabled
    if (this.histogramOptions.showCumulative) {
      this.cumulativeCurve = calculateCumulative(this.binResult.bins, true);
    } else {
      this.cumulativeCurve = [];
    }

    // Update line pass with overlay curves
    this.updateLinePass();
  }

  /**
   * Update line pass with overlay curves
   */
  private updateLinePass(): void {
    if (!this.linePass) return;

    const curves: OverlayCurve[] = [];

    // Add KDE curve if enabled
    if (this.kdeCurve.length > 0) {
      curves.push({
        points: this.kdeCurve,
        color: this.histogramOptions.densityCurveColor ?? DEFAULT_DENSITY_COLOR,
        lineWidth: this.histogramOptions.densityCurveWidth ?? 2,
        useSecondaryY: false,
      });
    }

    // Add cumulative curve if enabled
    if (this.cumulativeCurve.length > 0) {
      curves.push({
        points: this.cumulativeCurve,
        color: this.histogramOptions.cumulativeColor ?? DEFAULT_CUMULATIVE_COLOR,
        lineWidth: this.histogramOptions.cumulativeWidth ?? 2,
        useSecondaryY: true,
      });
    }

    this.linePass.updateData(curves);
  }

  /**
   * Update histogram render pass with current bins
   */
  private updateHistogramData(): void {
    if (!this.histogramRenderPass || !this.binResult) return;

    const barColor = this.histogramOptions.barColor ?? DEFAULT_BAR_COLOR;
    const barGap = this.histogramOptions.barGap ?? 1;

    this.histogramRenderPass.updateData(this.binResult.bins, barColor, barGap);
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

    if (this.histogramRenderPass) {
      this.histogramRenderPass.setPixelRatio(this.pixelRatio);
    }

    if (this.linePass) {
      this.linePass.setPixelRatio(this.pixelRatio);
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
  protected onOptionsUpdate(options: Partial<HistogramChartOptions>): void {
    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      this.axisRenderer.updateConfig(options.xAxis, options.yAxis);
    }

    // Update histogram-specific options
    const needsReprocess =
      options.binning !== undefined ||
      options.showDensityCurve !== undefined ||
      options.showCumulative !== undefined ||
      options.densityBandwidth !== undefined;

    const needsLineUpdate =
      options.densityCurveColor !== undefined ||
      options.densityCurveWidth !== undefined ||
      options.cumulativeColor !== undefined ||
      options.cumulativeWidth !== undefined;

    Object.assign(this.histogramOptions, options);

    if (needsReprocess && this.values.length > 0) {
      this.processData();
    } else if (options.barColor !== undefined || options.barGap !== undefined) {
      this.updateHistogramData();
    } else if (needsLineUpdate) {
      this.updateLinePass();
    }

    // Update margins if changed
    if (options.margins) {
      if (this.histogramRenderPass) {
        this.histogramRenderPass.setMargins(this.margins);
      }
      if (this.linePass) {
        this.linePass.setMargins(this.margins);
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
   * Override data update - histogram uses setValues instead
   */
  protected onDataUpdate(): void {
    // Histogram doesn't use the series-based data model
    // Use setValues() instead
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
   * Hit test to find bin at pixel coordinates
   */
  hitTestBin(pixelX: number, pixelY: number): HistogramBarData | null {
    if (!this.histogramRenderPass) return null;

    const ctx = {
      width: this.state.viewport.width,
      height: this.state.viewport.height,
      pixelRatio: this.pixelRatio,
    };

    return this.histogramRenderPass.hitTest(pixelX, pixelY, ctx, this.state);
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
    const coords = this.axisRenderer.pixelToData(cssX, cssY);
    // For histograms, coerce values to numbers
    return {
      x: typeof coords.x === 'number' ? coords.x : coords.x instanceof Date ? coords.x.getTime() : 0,
      y: typeof coords.y === 'number' ? coords.y : coords.y instanceof Date ? coords.y.getTime() : 0,
    };
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
    // Remove event listeners
    if (this.pointerMoveHandler) {
      this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }
    if (this.pointerLeaveHandler) {
      this.canvas.removeEventListener('pointerleave', this.pointerLeaveHandler);
      this.pointerLeaveHandler = null;
    }
    if (this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }

    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    super.dispose();
  }
}
