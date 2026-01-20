/**
 * Boxplot chart implementation for statistical distribution data
 */

import type {
  RenderPass,
  Series,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import type {
  BoxplotChartOptions,
  BoxplotChartConfig,
  Boxplot,
  QuartileDataPoint,
  BoxplotOrientation,
} from '../../types/boxplot.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { BoxplotRenderPass } from './BoxplotRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';

/**
 * Default colors for boxplots
 */
const DEFAULT_BOX_COLOR: RGBAColor = [0.3, 0.5, 0.8, 1.0]; // Blue
const DEFAULT_MEDIAN_COLOR: RGBAColor = [0.9, 0.3, 0.3, 1.0]; // Red
const DEFAULT_WHISKER_COLOR: RGBAColor = [0.3, 0.3, 0.3, 1.0]; // Dark gray
const DEFAULT_OUTLIER_COLOR: RGBAColor = [0.8, 0.5, 0.2, 1.0]; // Orange

/**
 * Boxplot chart for visualizing statistical distribution data
 */
export class BoxplotChart extends BaseChart {
  private boxplotOptions: BoxplotChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private boxplotRenderPass!: BoxplotRenderPass;

  // Processed boxplot data for hit testing
  private boxplots: Boxplot[] = [];

  // Category names
  private categories: string[] = [];

  // Hover state
  private hoveredBoxplot: Boxplot | null = null;

  constructor(config: BoxplotChartConfig) {
    const options = config.options ?? {};

    super(config as BaseChartConfig);

    this.boxplotOptions = options;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.createXAxisConfig(),
      yAxis: this.createYAxisConfig(),
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.boxplotRenderPass = this.renderer.getRenderPass('boxplot') as BoxplotRenderPass;

    // Initialize axis renderer
    this.initializeAxisRenderer();

    // Setup hover interaction
    this.setupHoverInteraction();
  }

  /**
   * Get the chart orientation
   */
  getOrientation(): BoxplotOrientation {
    return this.boxplotOptions?.orientation ?? 'vertical';
  }

  /**
   * Create X-axis config
   */
  private createXAxisConfig() {
    const baseConfig = this.boxplotOptions?.xAxis ?? {};
    const orientation = this.getOrientation();

    if (orientation === 'vertical') {
      // X axis is categories for vertical charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        formatter: (value: number) => {
          const index = Math.round(value);
          if (index >= 0 && index < this.categories.length) {
            return this.categories[index];
          }
          return '';
        },
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? (this.categories.length || 6),
        },
      };
    } else {
      // X axis is values for horizontal charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    }
  }

  /**
   * Create Y-axis config
   */
  private createYAxisConfig() {
    const baseConfig = this.boxplotOptions?.yAxis ?? {};
    const orientation = this.getOrientation();

    if (orientation === 'vertical') {
      // Y axis is values for vertical charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    } else {
      // Y axis is categories for horizontal charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        formatter: (value: number) => {
          const index = Math.round(value);
          if (index >= 0 && index < this.categories.length) {
            return this.categories[index];
          }
          return '';
        },
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? (this.categories.length || 6),
        },
      };
    }
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
   * Setup hover interaction for tooltips
   */
  private setupHoverInteraction(): void {
    this.addInteraction({
      id: 'boxplot-hover',
      enabled: true,
      attach: () => {},
      detach: () => {},
      onPointerMove: (event) => {
        const box = this.boxplotRenderPass.hitTest(event.x, event.y);

        if (box !== this.hoveredBoxplot) {
          // Clear previous hover
          if (this.hoveredBoxplot) {
            this.hoveredBoxplot.hovered = false;
          }

          // Set new hover
          this.hoveredBoxplot = box;

          if (box) {
            box.hovered = true;
            this.showTooltip(box, event.originalEvent);
          } else {
            this.hideTooltip();
          }

          // Re-upload data with updated hover state
          this.boxplotRenderPass.updateData(this.boxplots);
          this.render();
        } else if (box) {
          // Update tooltip position
          this.showTooltip(box, event.originalEvent);
        }
      },
    });
  }

  /**
   * Show tooltip for a boxplot
   */
  private showTooltip(box: Boxplot, event: PointerEvent | WheelEvent): void {
    const tooltip = this.getTooltipElement();

    const formatValue = (value: number) => value.toFixed(2);
    const categoryName = box.categoryName || `Category ${box.index + 1}`;

    const content = `
      <div style="
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="font-weight: bold; margin-bottom: 4px; color: #60a5fa;">
          ${categoryName}
        </div>
        <div style="display: grid; grid-template-columns: auto auto; gap: 2px 12px;">
          <span style="color: #9ca3af;">Max:</span>
          <span>${formatValue(box.max)}</span>
          <span style="color: #9ca3af;">Q3:</span>
          <span>${formatValue(box.q3)}</span>
          <span style="color: #9ca3af;">Median:</span>
          <span style="color: #f87171; font-weight: bold;">${formatValue(box.median)}</span>
          <span style="color: #9ca3af;">Q1:</span>
          <span>${formatValue(box.q1)}</span>
          <span style="color: #9ca3af;">Min:</span>
          <span>${formatValue(box.min)}</span>
        </div>
        ${box.outliers.length > 0 ? `
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #333; color: #fb923c;">
          Outliers: ${box.outliers.length} point${box.outliers.length > 1 ? 's' : ''}
        </div>
        ` : ''}
      </div>
    `;

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';

    // Position tooltip
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = 15;
    const offsetY = 15;

    let left = event.clientX - rect.left + offsetX;
    let top = event.clientY - rect.top + offsetY;

    // Prevent tooltip from going off-screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > rect.width) {
      left = event.clientX - rect.left - tooltipRect.width - offsetX;
    }
    if (top + tooltipRect.height > rect.height) {
      top = event.clientY - rect.top - tooltipRect.height - offsetY;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    tooltip.style.display = 'none';
  }

  /**
   * Create render passes for boxplot chart
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid render pass if enabled
    const gridEnabled = this.boxplotOptions?.grid !== false;
    if (gridEnabled) {
      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: this.boxplotOptions?.gridColor,
        showHorizontal: true,
        showVertical: true,
      });
      passes.push(gridPass);
    }

    // Add boxplot render pass
    const boxplotPass = new BoxplotRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
      orientation: this.boxplotOptions?.orientation,
      hoverBrighten: this.boxplotOptions?.hoverBrighten,
      whiskerWidth: this.boxplotOptions?.whiskerWidth,
      outlierSize: this.boxplotOptions?.outlierSize,
    });
    passes.push(boxplotPass);

    return passes;
  }

  /**
   * Set category labels
   */
  setCategories(categories: string[]): void {
    this.categories = categories;

    // Update axis renderer with new formatter
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), this.createYAxisConfig());
    }

    // Re-render if we have data
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Get current categories
   */
  getCategories(): string[] {
    return this.categories;
  }

  /**
   * Extract quartile data from a data point
   */
  private extractQuartiles(point: unknown): QuartileDataPoint | null {
    const p = point as {
      x?: number;
      y?: number;
      min?: number;
      q1?: number;
      median?: number;
      q3?: number;
      max?: number;
      outliers?: number[];
    };

    if (
      typeof p.x !== 'number' ||
      typeof p.min !== 'number' ||
      typeof p.q1 !== 'number' ||
      typeof p.median !== 'number' ||
      typeof p.q3 !== 'number' ||
      typeof p.max !== 'number'
    ) {
      return null;
    }

    return {
      x: p.x,
      y: p.median,
      min: p.min,
      q1: p.q1,
      median: p.median,
      q3: p.q3,
      max: p.max,
      outliers: p.outliers,
    };
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    const orientation = this.getOrientation();

    // Collect all quartile data
    const quartileData: QuartileDataPoint[] = [];
    for (const s of series) {
      if (s.visible === false) continue;
      for (const point of s.data) {
        const quartile = this.extractQuartiles(point);
        if (quartile) {
          quartileData.push(quartile);
        }
      }
    }

    // Sort by x (category index)
    quartileData.sort((a, b) => a.x - b.x);

    if (quartileData.length === 0) {
      this.boxplots = [];
      this.boxplotRenderPass.updateData([]);
      return;
    }

    // Calculate domains
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (const point of quartileData) {
      minValue = Math.min(minValue, point.min);
      maxValue = Math.max(maxValue, point.max);
      // Also check outliers
      if (point.outliers) {
        for (const outlier of point.outliers) {
          minValue = Math.min(minValue, outlier);
          maxValue = Math.max(maxValue, outlier);
        }
      }
    }

    // Add padding
    const valueRange = maxValue - minValue || 1;
    const valuePadding = valueRange * 0.1;

    let xDomain: [number, number];
    let yDomain: [number, number];

    if (orientation === 'vertical') {
      // X is categories, Y is values
      xDomain = [-0.5, quartileData.length - 0.5];
      yDomain = [minValue - valuePadding, maxValue + valuePadding];
    } else {
      // X is values, Y is categories
      xDomain = [minValue - valuePadding, maxValue + valuePadding];
      yDomain = [-0.5, quartileData.length - 0.5];
    }

    // Update state domain and initial domain
    this.state.domain = { x: xDomain, y: yDomain };
    this.initialDomain = { x: [...xDomain], y: [...yDomain] };

    // Calculate boxplot layout and upload to GPU
    this.updateBoxplotLayout(quartileData, series[0]?.id);

    // Update axis renderer
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), this.createYAxisConfig());
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Calculate boxplot layout and generate boxplot data
   */
  private updateBoxplotLayout(quartileData: QuartileDataPoint[], seriesId?: string): void {
    const { width, height } = this.state.viewport;
    if (width === 0 || height === 0 || quartileData.length === 0) {
      this.boxplots = [];
      this.boxplotRenderPass.updateData([]);
      return;
    }

    const orientation = this.getOrientation();
    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const plotRight = width - margins.right * this.pixelRatio;
    const plotBottom = height - margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = this.state.domain;

    const boxColor = this.boxplotOptions?.boxColor ?? DEFAULT_BOX_COLOR;
    const medianColor = this.boxplotOptions?.medianColor ?? DEFAULT_MEDIAN_COLOR;
    const whiskerColor = this.boxplotOptions?.whiskerColor ?? DEFAULT_WHISKER_COLOR;
    const outlierColor = this.boxplotOptions?.outlierColor ?? DEFAULT_OUTLIER_COLOR;
    const boxWidthRatio = this.boxplotOptions?.boxWidth ?? 0.6;

    // Calculate box width based on data density
    const categoryAxisLength = orientation === 'vertical' ? plotWidth : plotHeight;
    const boxSpacing = categoryAxisLength / quartileData.length;
    const boxWidth = boxSpacing * boxWidthRatio;

    const boxplots: Boxplot[] = [];

    for (let i = 0; i < quartileData.length; i++) {
      const point = quartileData[i];

      // Calculate position on category axis
      let categoryNormalized: number;
      let categoryPos: number;

      if (orientation === 'vertical') {
        categoryNormalized = (point.x - domain.x[0]) / (domain.x[1] - domain.x[0]);
        categoryPos = plotLeft + categoryNormalized * plotWidth;
      } else {
        // For horizontal orientation, flip Y domain to correct pan direction
        // Pan handler uses Y-up coords, but category axis uses Y-down (screen coords)
        const initial = this.initialDomain;
        if (initial) {
          const flippedDomainY0 = initial.y[0] + initial.y[1] - domain.y[1];
          const flippedDomainY1 = initial.y[0] + initial.y[1] - domain.y[0];
          categoryNormalized = (point.x - flippedDomainY0) / (flippedDomainY1 - flippedDomainY0);
        } else {
          categoryNormalized = (point.x - domain.y[0]) / (domain.y[1] - domain.y[0]);
        }
        categoryPos = plotTop + categoryNormalized * plotHeight;
      }

      boxplots.push({
        index: i,
        position: categoryPos,
        width: boxWidth,
        min: point.min,
        q1: point.q1,
        median: point.median,
        q3: point.q3,
        max: point.max,
        outliers: point.outliers ?? [],
        boxColor: [...boxColor],
        medianColor: [...medianColor],
        whiskerColor: [...whiskerColor],
        outlierColor: [...outlierColor],
        dataIndex: i,
        seriesId,
        categoryName: this.categories[i] || `Category ${i + 1}`,
      });
    }

    this.boxplots = boxplots;

    // Update render pass with domain and plot area
    const plotArea = {
      x: plotLeft,
      y: plotTop,
      width: plotWidth,
      height: plotHeight,
    };

    this.boxplotRenderPass.setOrientation(orientation);
    this.boxplotRenderPass.setDomain(domain);
    this.boxplotRenderPass.setPlotArea(plotArea);
    this.boxplotRenderPass.updateData(boxplots);
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

    if (this.boxplotRenderPass) {
      this.boxplotRenderPass.setPixelRatio(this.pixelRatio);
    }

    if (this.gridRenderPass) {
      this.gridRenderPass.setPixelRatio(this.pixelRatio);
      this.syncGridTicks();
    }

    // Re-layout boxplots
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Called when domain changes (zoom/pan)
   */
  protected onDomainChange(domain: DataDomain): void {
    const orientation = this.getOrientation();

    // For horizontal orientation, flip Y domain to correct pan direction
    let renderDomain = domain;
    if (orientation === 'horizontal' && this.initialDomain) {
      const initial = this.initialDomain;
      renderDomain = {
        x: domain.x,
        y: [
          initial.y[0] + initial.y[1] - domain.y[1],
          initial.y[0] + initial.y[1] - domain.y[0],
        ],
      };
    }

    if (this.axisRenderer) {
      this.axisRenderer.setDomain(renderDomain);
      this.axisRenderer.render();
    }
    this.syncGridTicks();

    // Re-layout boxplots with new domain
    if (this.series.length > 0) {
      // Re-extract quartile data and recalculate layout
      const quartileData: QuartileDataPoint[] = [];
      for (const s of this.series) {
        if (s.visible === false) continue;
        for (const point of s.data) {
          const quartile = this.extractQuartiles(point);
          if (quartile) {
            quartileData.push(quartile);
          }
        }
      }
      quartileData.sort((a, b) => a.x - b.x);
      this.updateBoxplotLayout(quartileData, this.series[0]?.id);
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
  protected onOptionsUpdate(options: Partial<BoxplotChartOptions>): void {
    // Update boxplot-specific options first (before createXAxisConfig/createYAxisConfig are called)
    Object.assign(this.boxplotOptions, options);

    // Update orientation if changed - this affects axis configuration
    if (options.orientation) {
      this.boxplotRenderPass.setOrientation(options.orientation);
      // Orientation change requires full axis reconfiguration since formatter moves between axes
      if (this.axisRenderer) {
        this.axisRenderer.updateConfig(this.createXAxisConfig(), this.createYAxisConfig());
      }
    } else if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      // Only update specific axis if no orientation change
      const xConfig = options.xAxis ? { ...options.xAxis, ...this.createXAxisConfig() } : undefined;
      const yConfig = options.yAxis ? { ...options.yAxis, ...this.createYAxisConfig() } : undefined;
      this.axisRenderer.updateConfig(xConfig, yConfig);
    }

    // Re-layout if needed
    if (
      options.boxColor !== undefined ||
      options.medianColor !== undefined ||
      options.whiskerColor !== undefined ||
      options.outlierColor !== undefined ||
      options.boxWidth !== undefined ||
      options.orientation !== undefined
    ) {
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
      }
    }

    // Update margins if changed
    if (options.margins) {
      if (this.boxplotRenderPass) {
        this.boxplotRenderPass.setMargins(this.margins);
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
   * Hit test to find boxplot at pixel coordinates
   */
  hitTestBoxplot(pixelX: number, pixelY: number): Boxplot | null {
    return this.boxplotRenderPass.hitTest(pixelX, pixelY);
  }

  /**
   * Get all boxplots
   */
  getBoxplots(): Boxplot[] {
    return this.boxplots;
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
    this.hideTooltip();
    super.dispose();
  }
}
